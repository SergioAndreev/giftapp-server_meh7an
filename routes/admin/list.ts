import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { adminAuthMiddleware } from "@/lib/adminAuth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";

const router = Router();

router.get(
  "/list",
  adminAuthMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.telegramUser?.id) {
        res.status(500).json({
          error: "User not found",
          success: false,
          data: null,
        });
        return;
      }
      if (!req.isAdmin) {
        res
          .status(403)
          .json({ error: "Unauthorized", success: false, data: null });
        return;
      }
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const adminsCount = await mongodb.client
        .db("giftApp")
        .collection("admins")
        .countDocuments();
      if (page < 1 || (page - 1) * limit > adminsCount) {
        res.json({
          error: null,
          success: true,
          data: {
            admins: [],
            hasNext: false,
          },
        });
        return;
      }
      const admins = await mongodb.client
        .db("giftApp")
        .collection("admins")
        .find()
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      res.json({
        error: null,
        success: true,
        data: {
          admins,
          hasNext: adminsCount > page * limit,
        },
      });
    } catch (error) {
      logger.error("Error getting admin status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
