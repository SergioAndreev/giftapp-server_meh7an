import { adminSchema, adminIndexes } from "@/schemas/adminSchema";
import { Collection, Db } from "mongodb";
import logger from "../logger";

export const initializeAdminsCollection = async (
  db: Db
): Promise<Collection> => {
  const collections = await db.listCollections({ name: "admins" }).toArray();
  const collection = db.collection("admins");

  if (collections.length === 0) {
    try {
      await db.createCollection("admins", {
        validator: adminSchema,
        validationLevel: "strict",
        validationAction: "error",
      });
    } catch (error) {
      logger.error("Error creating admins collection:", error);
      throw error;
    }
  }

  await collection.createIndexes([
    ...adminIndexes,
    { key: { role: 1 } },
    { key: { isActive: 1 } },
    { key: { addedAt: -1 } },
  ]);

  return collection;
};
