import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { adminAuthMiddleware } from "@/lib/adminAuth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { transformMongoDocuments } from "@/lib/transformer";
import { Gift } from "@/types/gift";

const router = Router();

router.get("/list", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.telegramUser?.id) {
      res.status(401).json({
        error: "Unauthorized: User not found",
        success: false,
        data: null,
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 10)
    );

    const giftsCollection = mongodb.client
      .db("giftApp")
      .collection<Gift>("gifts");

    const giftsCount = await giftsCollection.countDocuments();

    if ((page - 1) * limit >= giftsCount) {
      res.json({
        error: null,
        success: true,
        data: {
          gifts: [],
          hasNext: false,
          total: giftsCount,
        },
      });
      return;
    }

    const gifts = await giftsCollection
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const transformedGifts = transformMongoDocuments(gifts);

    res.json({
      error: null,
      success: true,
      data: {
        gifts: transformedGifts,
        hasNext: giftsCount > page * limit,
        total: giftsCount,
      },
    });
  } catch (error) {
    logger.error("Error fetching gifts:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
