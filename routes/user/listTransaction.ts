import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import {
  transformMongoDocument,
  transformMongoDocuments,
} from "@/lib/transformer";
import {
  Transaction,
  TransactionListResponse,
  TransactionType,
} from "@/types/transaction";
import { User } from "@/types/user";
import exp from "constants";
import { Router } from "express";
import { WithId } from "mongodb";

interface ApiResponse<T> {
  error: string | null;
  success: boolean;
  data: T | null;
}

const router = Router();

router.get("/transaction/list", async (req: AuthenticatedRequest, res) => {
  try {
    if (!mongodb.client) {
      const response: ApiResponse<null> = {
        error: "Database connection not available",
        success: false,
        data: null,
      };
      res.status(503).json(response);
      return;
    }

    if (!req.telegramUser?.id) {
      const response: ApiResponse<null> = {
        error: "Unauthorized: User not found",
        success: false,
        data: null,
      };
      res.status(401).json(response);
      return;
    }

    // Get pagination params, just like in the leaderboard
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50, // Max 50 items per page
      Math.max(1, parseInt(req.query.limit as string, 10) || 10)
    );

    const userId = req.telegramUser.id;

    const userCollection = mongodb.client.db().collection<User>("users");
    const user = await userCollection.findOne({ telegramId: userId });

    if (!user) {
      res.status(404).json({
        error: "User not found",
        success: false,
        data: null,
      });
      return;
    }

    // get the user's transactions
    const userTransactions = user.transactions;
    const totalCount = userTransactions.length;

    // Check if page is out of bounds
    if ((page - 1) * limit >= totalCount) {
      const response: ApiResponse<TransactionListResponse> = {
        error: null,
        success: true,
        data: {
          items: [],
          total: totalCount,
          hasNext: false,
        },
      };
      res.json(response);
      return;
    }
    const skip = (page - 1) * limit;
    const transactions = await mongodb.client
      .db()
      .collection<Transaction>("transactions")
      .aggregate([
        {
          $facet: {
            purchases: [
              {
                $match: {
                  senderId: userId,
                  status: "COMPLETED",
                },
              },
              {
                $addFields: {
                  timePoint: "$createdAt",
                  event: "PURCHASED",
                },
              },
            ],

            transfers: [
              {
                $match: {
                  status: "COMPLETED",
                  receiverId: { $ne: 0 },
                  $or: [{ senderId: userId }, { receiverId: userId }],
                },
              },
              {
                $addFields: {
                  timePoint: "$updatedAt",
                  event: {
                    $cond: {
                      if: { $eq: ["$senderId", userId] },
                      then: "SENT",
                      else: "RECEIVED",
                    },
                  },
                },
              },
            ],
          },
        },

        {
          $project: {
            all: { $concatArrays: ["$purchases", "$transfers"] },
          },
        },
        { $unwind: "$all" },
        { $replaceRoot: { newRoot: "$all" } },

        {
          $group: {
            _id: {
              id: "$_id",
              event: "$event",
            },
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },

        // Lookup gift
        {
          $lookup: {
            from: "gifts",
            localField: "giftId",
            foreignField: "_id",
            as: "giftDetails",
          },
        },
        { $unwind: "$giftDetails" },

        // Lookup sender details
        {
          $lookup: {
            from: "users",
            localField: "senderId",
            foreignField: "telegramId",
            as: "senderDetails",
          },
        },
        { $unwind: "$senderDetails" },

        // Lookup receiver details
        {
          $lookup: {
            from: "users",
            localField: "receiverId",
            foreignField: "telegramId",
            as: "receiverDetails",
          },
        },
        { $unwind: "$receiverDetails" },

        // Restructure with conditional user details
        {
          $addFields: {
            gift: "$giftDetails",
            sender: {
              $cond: {
                if: { $eq: ["$senderId", userId] },
                then: {},
                else: {
                  firstName: "$senderDetails.firstName",
                  lastName: "$senderDetails.lastName",
                  isPremium: "$senderDetails.isPremium",
                  totalGiftsCount: "$senderDetails.totalGiftsCount",
                  telegramId: "$senderDetails.telegramId",
                },
              },
            },
            receiver: {
              $cond: {
                if: { $eq: ["$receiverId", userId] },
                then: {},
                else: {
                  firstName: "$receiverDetails.firstName",
                  lastName: "$receiverDetails.lastName",
                  isPremium: "$receiverDetails.isPremium",
                  totalGiftsCount: "$receiverDetails.totalGiftsCount",
                  telegramId: "$receiverDetails.telegramId",
                },
              },
            },
          },
        },

        // Clean up the output
        {
          $project: {
            _id: 1,
            senderId: 1,
            receiverId: 1,
            status: 1,
            createdAt: 1,
            updatedAt: 1,
            price: 1,
            currency: 1,
            event: 1,
            timePoint: 1,
            gift: 1,
            sender: 1,
            receiver: 1,
          },
        },

        { $sort: { timePoint: -1 } },
        { $skip: skip },
        { $limit: limit },
      ])
      .toArray();

    const transformedTransactions = transformMongoDocuments<Transaction>(
      transactions as WithId<Transaction>[]
    );

    const response: ApiResponse<TransactionListResponse> = {
      error: null,
      success: true,
      data: {
        items: transformedTransactions as unknown as Transaction[],
        total: totalCount,
        hasNext: totalCount > page * limit,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching users leaderboard:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
