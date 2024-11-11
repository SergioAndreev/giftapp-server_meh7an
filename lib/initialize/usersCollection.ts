import { userSchema } from "@/schemas/userSchema";
import { Collection, Db, IndexDescription } from "mongodb";
import logger from "../logger";

export const userIndexes: IndexDescription[] = [
  {
    key: { telegramId: 1 },
    unique: true,
  },
  {
    key: { username: 1 },
    sparse: true,
  },
  {
    key: { totalGiftsCount: -1 },
  },
];

export const initializeUsersCollection = async (
  db: Db
): Promise<Collection> => {
  const collections = await db.listCollections({ name: "users" }).toArray();
  const collection = db.collection("users");

  if (collections.length === 0) {
    try {
      await db.createCollection("users", {
        validator: userSchema,
        validationLevel: "strict",
        validationAction: "error",
      });
    } catch (error) {
      logger.error("Error creating users collection:", error);
      throw error;
    }
  }

  await collection.createIndexes([
    ...userIndexes,
    { key: { isPremium: 1 } },
    { key: { transactions: 1 } },
    { key: { createdAt: -1 } },
    { key: { isPremium: 1, totalGiftsCount: -1 } },
  ]);

  return collection;
};
