import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { transformMongoDocuments } from "@/lib/transformer";
import { Gift } from "@/types/gift";

const router = Router();

router.get("/:slug", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.telegramUser?.id) {
      res.status(401).json({
        error: "Unauthorized: User not found",
        success: false,
        data: null,
      });
      return;
    }

    const { slug } = req.params;

    const giftsCollection = mongodb.client
      .db("giftApp")
      .collection<Gift>("gifts");

    const gift = await giftsCollection.findOne({ slug });

    if (!gift) {
      res.status(404).json({
        error: "Gift not found",
        success: false,
        data: null,
      });
      return;
    }

    const transformedGift = transformMongoDocuments([gift])[0];

    res.json({
      error: null,
      success: true,
      data: transformedGift,
    });
  } catch (error) {
    logger.error("Error fetching gift:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
