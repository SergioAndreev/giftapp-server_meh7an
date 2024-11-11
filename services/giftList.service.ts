import { mongodb } from "@/lib/connection";
import { User } from "@/types/user";
import { Transaction } from "@/types/transaction";
import { ObjectId, WithId, Db } from "mongodb";
import {
  transformMongoDocuments,
  TransformedDocument,
} from "@/lib/transformer";

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface GiftListResponse {
  items: TransformedDocument<Transaction>[];
  hasNext: boolean;
  total: number;
}

export class GiftListService {
  private getDb(): Db {
    if (!mongodb.client) {
      throw new Error("MongoDB client not initialized");
    }
    return mongodb.client.db("giftApp");
  }

  private validatePaginationParams(query: any): PaginationParams {
    const page = Math.max(1, parseInt(query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(query.limit as string, 10) || 10)
    );
    return { page, limit };
  }

  private async getUser(telegramId: number): Promise<User> {
    const user = await this.getDb()
      .collection<User>("users")
      .findOne({ telegramId });
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  private async fetchTransactionsWithGifts(
    transactionIds: ObjectId[],
    pagination: PaginationParams
  ): Promise<TransformedDocument<Transaction>[]> {
    const { page, limit } = pagination;
    const pagedTransactionIds = transactionIds.slice(
      (page - 1) * limit,
      page * limit
    );

    const transactions = await this.getDb()
      .collection<Transaction>("transactions")
      .aggregate<WithId<Transaction>>([
        { $match: { _id: { $in: pagedTransactionIds } } },
        {
          $lookup: {
            from: "gifts",
            localField: "giftId",
            foreignField: "_id",
            as: "gift",
          },
        },
        { $unwind: "$gift" },
        { $unset: "giftId" },
      ])
      .toArray();

    return transformMongoDocuments(transactions);
  }

  async getGiftList(
    telegramId: number,
    paginationQuery: any,
    isPending = false
  ): Promise<GiftListResponse> {
    const pagination = this.validatePaginationParams(paginationQuery);
    const user = await this.getUser(telegramId);
    const totalGifts = isPending ? user.pendingGifts.length : user.gifts.length;

    if ((pagination.page - 1) * pagination.limit >= totalGifts) {
      return {
        items: [],
        hasNext: false,
        total: totalGifts,
      };
    }

    const items = await this.fetchTransactionsWithGifts(
      isPending ? user.pendingGifts : user.gifts,
      pagination
    );

    return {
      items,
      hasNext: totalGifts > pagination.page * pagination.limit,
      total: totalGifts,
    };
  }
}

// Export a singleton instance
export const giftListService = new GiftListService();
