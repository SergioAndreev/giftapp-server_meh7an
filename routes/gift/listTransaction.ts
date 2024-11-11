import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { transformMongoDocuments } from "@/lib/transformer";
import { Transaction, TransactionListResponse } from "@/types/transaction";
import { ObjectId } from "mongodb";

interface ApiResponse<T> {
  error: string | null;
  success: boolean;
  data: T | null;
}

const router = Router();

router.get(
  "/transaction/list/:giftId",
  async (req: AuthenticatedRequest, res) => {
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

      const { giftId } = req.params;

      // Validate giftId format
      if (!ObjectId.isValid(giftId)) {
        res.status(400).json({
          error: "Invalid gift ID format",
          success: false,
          data: null,
        });
        return;
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(
        50, // Max 50 items per page
        Math.max(1, parseInt(req.query.limit as string, 10) || 10)
      );

      // First, check if the gift exists
      const giftsCollection = mongodb.client.db().collection("gifts");
      const gift = await giftsCollection.findOne({ _id: new ObjectId(giftId) });

      if (!gift) {
        res.status(404).json({
          error: "Gift not found",
          success: false,
          data: null,
        });
        return;
      }

      const skip = (page - 1) * limit;

      // Get transactions with events, similar to the transactions list
      const transactions = await mongodb.client
        .db()
        .collection<Transaction>("transactions")
        .aggregate([
          {
            $facet: {
              purchases: [
                {
                  $match: {
                    giftId: new ObjectId(giftId),
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
                    giftId: new ObjectId(giftId),
                    status: "COMPLETED",
                    receiverId: { $ne: 0 },
                  },
                },
                {
                  $addFields: {
                    timePoint: "$updatedAt",
                    event: "SENT",
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

          // Remove duplicates keeping the latest event
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

          // Structure the output
          {
            $project: {
              _id: 0,
              senderId: 1,
              receiverId: 1,
              status: 1,
              createdAt: 1,
              updatedAt: 1,
              price: 1,
              currency: 1,
              event: 1,
              timePoint: 1,
              sender: {
                firstName: "$senderDetails.firstName",
                lastName: "$senderDetails.lastName",
                isPremium: "$senderDetails.isPremium",
                totalGiftsCount: "$senderDetails.totalGiftsCount",
                telegramId: "$senderDetails.telegramId",
              },
              receiver: {
                firstName: "$receiverDetails.firstName",
                lastName: "$receiverDetails.lastName",
                isPremium: "$receiverDetails.isPremium",
                totalGiftsCount: "$receiverDetails.totalGiftsCount",
                telegramId: "$receiverDetails.telegramId",
              },
            },
          },

          { $sort: { timePoint: -1 } },
          { $skip: skip },
          { $limit: limit },
        ])
        .toArray();

      // Get total count for pagination
      const totalCount = await mongodb.client
        .db()
        .collection<Transaction>("transactions")
        .countDocuments({
          giftId: new ObjectId(giftId),
          status: "COMPLETED",
        });

      const response: ApiResponse<TransactionListResponse> = {
        error: null,
        success: true,
        data: {
          items: transactions as unknown as Transaction[],
          total: totalCount,
          hasNext: totalCount > page * limit,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error("Error fetching gift transactions:", error);
      res.status(500).json({
        error: "Internal server error",
        success: false,
        data: null,
      });
    }
  }
);

export default router;
