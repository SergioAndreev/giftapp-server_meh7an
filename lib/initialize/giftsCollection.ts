import { giftSchema } from "@/schemas/giftSchema";
import { Collection, Db } from "mongodb";
import logger from "../logger";

export const initializeGiftsCollection = async (
  db: Db
): Promise<Collection> => {
  const collections = await db.listCollections({ name: "gifts" }).toArray();
  const collection = db.collection("gifts");
  if (collections.length === 0) {
    try {
      await db.createCollection("gifts", {
        validator: giftSchema,
        validationLevel: "strict",
        validationAction: "error",
      });
    } catch (error) {
      logger.error("Error creating gifts collection:", error);
      throw error;
    }
  }
  await collection.createIndexes([
    { key: { slug: 1 }, unique: true },
    { key: { name: 1 } },
    { key: { price: 1 } },
    { key: { sold: 1 } },
  ]);

  return collection;
};
