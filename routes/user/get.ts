import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { transformMongoDocuments } from "@/lib/transformer";
import { User } from "@/types/user";

const router = Router();

router.get("/profile/:telegramId", async (req: AuthenticatedRequest, res) => {
  try {
    const telegramId = parseInt(req.params.telegramId, 10);

    if (isNaN(telegramId)) {
      res.status(400).json({
        error: "Invalid telegram ID format",
        success: false,
        data: null,
      });
      return;
    }

    const usersCollection = mongodb.client
      .db("giftApp")
      .collection<User>("users");

    const user = await usersCollection.findOne(
      { telegramId },
      {
        projection: {
          gifts: 0,
          pendingGifts: 0,
          transactions: 0,
          createdAt: 0,
          updatedAt: 0,
          _id: 0,
        },
      }
    );

    if (!user) {
      res.status(404).json({
        error: "User not found",
        success: false,
        data: null,
      });
      return;
    }

    const rankAggregation = await usersCollection
      .aggregate([
        {
          $match: {
            totalGiftsCount: { $gte: user.totalGiftsCount },
          },
        },
        {
          $count: "rank",
        },
      ])
      .toArray();

    const rank = rankAggregation[0]?.rank || 1;

    const transformedUser = {
      ...user,
      rank,
    };

    res.json({
      error: null,
      success: true,
      data: transformedUser,
    });
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
