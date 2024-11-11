import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";

export const adminAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.telegramUser?.id) {
      res.status(401).json({ error: "Unauthorized - No user found" });
      return;
    }

    const admin = await mongodb.client
      .db("giftApp")
      .collection("admins")
      .findOne({ telegramID: req.telegramUser.id });

    if (!admin || !admin.isActive) {
      res.status(403).json({ error: "Forbidden - Admin access required" });
      return;
    }

    req.isAdmin = true;

    next();
  } catch (error) {
    logger.error("Admin auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
