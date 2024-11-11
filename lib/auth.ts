import crypto from "crypto";
import { Request, Response, NextFunction, Application } from "express";
import { Collection, ObjectId } from "mongodb";
import logger from "./logger";

export interface AuthenticatedRequest extends Request {
  telegramUser?: {
    id: number;
    first_name: string;
    username?: string | null;
    last_name?: string;
    is_premium?: boolean;
    start_param?: string;
  };
  isAdmin?: boolean;
  userId?: ObjectId;
}

const verifyInitData = (initData: string, botToken: string): boolean => {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");
  urlParams.sort();
  let dataCheckString = "";
  for (const [key, value] of urlParams.entries()) {
    dataCheckString += `${key}=${value}\n`;
  }
  dataCheckString = dataCheckString.slice(0, -1);
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken ?? "");
  const calculatedHash = crypto
    .createHmac("sha256", secret.digest())
    .update(dataCheckString)
    .digest("hex");
  return calculatedHash === hash;
};

export const createAuthMiddleware = (usersCollection: Collection) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Verify Telegram WebApp authentication
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("TelegramWebApp ")) {
        res.status(401).json({ error: "No authorization header" });
        return;
      }

      const initData = authHeader.slice("TelegramWebApp ".length);

      const isValid = verifyInitData(initData, process.env.BOT_TOKEN!);

      if (!isValid) {
        res.status(401).json({ error: "Invalid authentication" });
        return;
      }

      const data = new URLSearchParams(decodeURIComponent(initData));
      const startParam = data.get("start_param") ?? "";
      const userDataString = data.get("user");

      if (!userDataString) {
        res.status(401).json({ error: "No user data found" });
        return;
      }

      const userData = JSON.parse(userDataString);

      // Set telegram user data immediately after parsing
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.telegramUser = {
        id: userData.id,
        first_name: userData.first_name,
        username: userData.username ?? null,
        last_name: userData.last_name,
        is_premium: userData.is_premium,
        start_param: startParam,
      };

      // Find existing user or create new one
      const existingUser = await usersCollection.findOne({
        telegramId: userData.id,
      });

      if (existingUser) {
        // Update user information if needed
        const updateData: Partial<typeof existingUser> = {
          updatedAt: new Date(),
        };

        if (userData.username !== existingUser.username) {
          updateData.username = userData.username;
        }
        if (userData.first_name !== existingUser.firstName) {
          updateData.firstName = userData.first_name;
        }
        if (userData.last_name !== existingUser.lastName) {
          updateData.lastName = userData.last_name;
        }
        if (userData.is_premium !== existingUser.isPremium) {
          updateData.isPremium = !!userData.is_premium;
        }

        if (Object.keys(updateData).length > 1) {
          await usersCollection.updateOne(
            { _id: existingUser._id },
            { $set: updateData }
          );
        }

        authenticatedReq.userId = existingUser._id;
      } else {
        // Create new user
        const newUser = {
          telegramId: userData.id,
          username: userData.username ?? null,
          firstName: userData.first_name,
          lastName: userData.last_name,
          isPremium: true,
          gifts: [],
          pendingGifts: [],
          transactions: [],
          totalGiftsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        let result;
        try {
          result = await usersCollection.insertOne(newUser);
        } catch (error) {
          console.log("Error:", error);
        }
        if (!result || !result.insertedId) {
          throw new Error("Failed to create new user");
        }
        if (!result.insertedId) {
          throw new Error("Failed to create new user");
        }

        authenticatedReq.userId = result.insertedId;
        logger.info(`Created new user with telegramId: ${userData.id}`);
      }

      next();
    } catch (error) {
      logger.error("Auth error:", error);
      res.status(401).json({ error: "Authentication failed" });
    }
  };
};
