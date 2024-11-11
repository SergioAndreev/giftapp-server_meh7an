import { Transaction } from "@/types/transaction";
import { Collection, ObjectId } from "mongodb";

interface Gift {
  _id: ObjectId;
  name: string;
  slug: string;
  price: number;
  currency: "USDT" | "TON" | "ETH" | "BTC" | "USD";
  totalAvailable: number;
  sold: number;
  color: string;
  patternID: string;
  lottieID: string;
}

interface TransactionWithGift extends Omit<Transaction, "giftId"> {
  gift: Gift;
}

export async function aggregateTransactionsWithGifts(
  transactionsCollection: Collection<Transaction>,
  query: object = {}
): Promise<TransactionWithGift[]> {
  const pipeline = [
    // Initial match stage (optional, based on query parameters)
    { $match: query },

    // Lookup gifts collection
    {
      $lookup: {
        from: "gifts", // assuming your gifts collection is named 'gifts'
        localField: "giftId",
        foreignField: "_id",
        as: "giftArray",
      },
    },

    // Unwind the gift array (since we know there's only one gift per transaction)
    {
      $unwind: "$giftArray",
    },

    // Restructure the document
    {
      $addFields: {
        gift: "$giftArray",
      },
    },

    // Remove unnecessary fields
    {
      $project: {
        giftId: 0,
        giftArray: 0,
      },
    },
  ];

  return await transactionsCollection
    .aggregate<TransactionWithGift>(pipeline)
    .toArray();
}

// Example usage for a single transaction
export async function getTransactionWithGift(
  transactionsCollection: Collection<Transaction>,
  transactionId: ObjectId
): Promise<TransactionWithGift | null> {
  const results = await aggregateTransactionsWithGifts(transactionsCollection, {
    _id: transactionId,
  });
  return results[0] || null;
}

// Example usage for transactions by user
export async function getUserTransactionsWithGifts(
  transactionsCollection: Collection<Transaction>,
  userId: number,
  role: "sender" | "receiver"
): Promise<TransactionWithGift[]> {
  const query =
    role === "sender" ? { senderId: userId } : { receiverId: userId };

  return await aggregateTransactionsWithGifts(transactionsCollection, query);
}
