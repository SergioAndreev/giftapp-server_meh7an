import { Db, Collection, MongoClient } from "mongodb";
import { Admin, AdminRole } from "@/types/admin";
import { AppError } from "./logger/errorHandler";
import logger from "./logger";
import { giftSchema } from "@/schemas/giftSchema";
import { initializeGiftsCollection } from "./initialize/giftsCollection";
import { initializeAdminsCollection } from "./initialize/adminsCollection";
import { initializeTransactionsCollection } from "./initialize/transactionsCollection";
import { initializeUsersCollection } from "./initialize/usersCollection";

// Add collections interface to export
export interface DatabaseCollections {
  adminsCollection: Collection;
  giftsCollection: Collection;
  transactionsCollection: Collection;
  usersCollection: Collection;
}

export async function initializeDatabase(
  client: MongoClient
): Promise<DatabaseCollections> {
  try {
    const db = client.db("giftApp");

    // Initialize all collections
    const adminsCollection = await initializeAdminsCollection(db);
    const giftsCollection = await initializeGiftsCollection(db);
    const transactionsCollection = await initializeTransactionsCollection(db);
    const usersCollection = await initializeUsersCollection(db);

    // Check if super admin exists
    const superAdminId = Number(process.env.SUPER_ADMIN_TELEGRAM_ID);
    if (!superAdminId) {
      throw new AppError(
        "SUPER_ADMIN_TELEGRAM_ID is not set in environment variables or invalid."
      );
    }

    const existingSuperAdmin = await adminsCollection.findOne({
      telegramID: superAdminId,
    });

    // Add super admin if doesn't exist
    if (!existingSuperAdmin) {
      const res = await adminsCollection.insertOne({
        name: "Super Admin",
        telegramID: superAdminId,
        addedBy: 0, // added by themselves
        addedAt: new Date(),
        isActive: true,
        role: AdminRole.SUPER_ADMIN,
      });

      if (!res.insertedId) {
        throw new AppError("Failed to add Super Admin.");
      }
      logger.info("Successfully added Super Admin.");
    }

    // Verify all indexes were created successfully
    const adminIndexes = await adminsCollection.indexes();
    const giftIndexes = await giftsCollection.indexes();
    const transactionIndexes = await transactionsCollection.indexes();
    const userIndexes = await usersCollection.indexes();

    // Verify admin indexes
    if (!adminIndexes.some((index) => index.key.telegramID === 1)) {
      throw new AppError(
        "Failed to create telegramID index on admins collection"
      );
    }

    // Verify gift indexes
    if (!giftIndexes.some((index) => index.key.slug === 1)) {
      throw new AppError("Failed to create slug index on gifts collection");
    }

    // Verify transaction indexes
    if (
      !transactionIndexes.some(
        (index) =>
          index.key.senderId === 1 &&
          index.key.status === 1 &&
          index.key.createdAt === -1
      )
    ) {
      throw new AppError(
        "Failed to create sender/status index on transactions collection"
      );
    }

    // Verify user indexes
    if (!userIndexes.some((index) => index.key.telegramId === 1)) {
      throw new AppError(
        "Failed to create telegramId index on users collection"
      );
    }
    if (!userIndexes.some((index) => index.key.totalGiftsCount === -1)) {
      throw new AppError(
        "Failed to create totalGiftsCount index on users collection"
      );
    }

    logger.info(
      "Successfully initialized database with all required collections and indexes."
    );
    return {
      adminsCollection,
      giftsCollection,
      transactionsCollection,
      usersCollection,
    };
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    throw error;
  }
}
