import { transactionSchema } from "@/schemas/transactionSchema";
import { Collection, Db } from "mongodb";
import logger from "../logger";

export const initializeTransactionsCollection = async (
  db: Db
): Promise<Collection> => {
  const collections = await db
    .listCollections({ name: "transactions" })
    .toArray();
  const collection = db.collection("transactions");

  if (collections.length === 0) {
    try {
      await db.createCollection("transactions", {
        validator: transactionSchema,
        validationLevel: "strict",
        validationAction: "error",
      });
    } catch (error) {
      logger.error("Error creating transactions collection:", error);
      throw error;
    }
  }

  await collection.createIndexes([
    { key: { senderId: 1, status: 1, createdAt: -1 } },
    { key: { receiverId: 1, status: 1, createdAt: -1 } },
    { key: { status: 1, createdAt: -1 } },
    { key: { giftId: 1, createdAt: -1 } },
  ]);

  return collection;
};
