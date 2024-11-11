import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import logger from "@/lib/logger";
import { mongodb } from "@/lib/connection";
import { giftListService } from "@/services/giftList.service";
import { GiftListResponse } from "@/services/giftList.service";
import { TransactionUser } from "@/types/transaction";

interface ApiResponse<T> {
  error: string | null;
  success: boolean;
  data: T | null;
}

const router = Router();

router.get("/gift/list", async (req: AuthenticatedRequest, res) => {
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

    const paginationQuery = { page: req.query.page, limit: req.query.limit };
    const isPending = req.query.status === "pending";
    const profileId = parseInt(req.query.id as string);

    if (isPending && ![req.telegramUser.id, 0, NaN].includes(profileId)) {
      const response: ApiResponse<null> = {
        error: "Unauthorized: Not allowed to view pending gifts of other users",
        success: false,
        data: null,
      };
      res.status(403).json(response);
      return;
    }

    const giftList = await giftListService.getGiftList(
      profileId || req.telegramUser.id,
      paginationQuery,
      isPending
    );

    if (!isPending && giftList.items) {
      const enrichedItems = await Promise.all(
        giftList.items.map(async (item) => {
          if (item.senderId) {
            const sender = await mongodb.client
              .db()
              .collection("users")
              .findOne(
                { telegramId: item.senderId },
                {
                  projection: {
                    telegramId: 1,
                    firstName: 1,
                    lastName: 1,
                    isPremium: 1,
                    totalGiftsCount: 1,
                    username: 1,
                    _id: 0,
                  },
                }
              );
            if (sender) {
              const transactionUser: TransactionUser = {
                firstName: sender.firstName,
                lastName: sender.lastName,
                isPremium: sender.isPremium,
                totalGiftsCount: sender.totalGiftsCount,
                telegramId: sender.telegramId,
                username: sender.username ?? null,
              };
              return { ...item, sender: transactionUser };
            }
            return { ...item, sender: undefined };
          }
          return item;
        })
      );
      giftList.items = enrichedItems;
    }

    const response: ApiResponse<GiftListResponse> = {
      error: null,
      success: true,
      data: giftList,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching gifts:", error);

    if (error instanceof Error) {
      if (error.message === "User not found") {
        const response: ApiResponse<null> = {
          error: "User not found",
          success: false,
          data: null,
        };
        res.status(404).json(response);
        return;
      }

      if (error.message === "MongoDB client not initialized") {
        const response: ApiResponse<null> = {
          error: "Database connection not available",
          success: false,
          data: null,
        };
        res.status(503).json(response);
        return;
      }
    }

    const response: ApiResponse<null> = {
      error: "Internal server error",
      success: false,
      data: null,
    };
    res.status(500).json(response);
  }
});

export default router;
