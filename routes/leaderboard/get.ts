import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { User } from "@/types/user";

type LeaderboardUserData = Pick<
  User,
  | "telegramId"
  | "username"
  | "firstName"
  | "lastName"
  | "isPremium"
  | "totalGiftsCount"
  | "createdAt"
>;

interface LeaderboardUser extends LeaderboardUserData {
  rank: number;
}

const router = Router();

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.telegramUser?.id) {
      res.status(401).json({
        error: "Unauthorized: User not found",
        success: false,
        data: null,
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string, 10) || 10)
    );
    const searchQuery = ((req.query.search as string) || "").trim();

    const usersCollection = mongodb.client
      .db("giftApp")
      .collection<User>("users");

    const searchFilter = searchQuery
      ? {
          $or: [
            { username: { $regex: searchQuery, $options: "i" } },
            { firstName: { $regex: searchQuery, $options: "i" } },
            { lastName: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};

    const usersCount = await usersCollection.countDocuments(searchFilter);

    if ((page - 1) * limit >= usersCount) {
      res.json({
        error: null,
        success: true,
        data: {
          users: [],
          hasNext: false,
          total: usersCount,
        },
      });
      return;
    }

    const allUsers = (await usersCollection
      .find(searchFilter)
      .sort({ totalGiftsCount: -1 })
      .project({
        telegramId: 1,
        username: 1,
        firstName: 1,
        lastName: 1,
        isPremium: 1,
        totalGiftsCount: 1,
        createdAt: 1,
        _id: 0,
      })
      .toArray()) as LeaderboardUserData[];

    const userRankMap = new Map(
      allUsers.map((user, index) => [JSON.stringify(user), index + 1])
    );

    const paginatedUsers = allUsers.slice((page - 1) * limit, page * limit);

    const rankedUsers: LeaderboardUser[] = paginatedUsers.map((user) => ({
      ...user,
      rank: userRankMap.get(JSON.stringify(user)) || 0,
    }));

    res.json({
      error: null,
      success: true,
      data: {
        users: rankedUsers,
        hasNext: usersCount > page * limit,
        total: usersCount,
      },
    });
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
