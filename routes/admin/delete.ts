import { Router, Response } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { adminAuthMiddleware } from "@/lib/adminAuth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";

const router = Router();

router.delete(
  "/delete/:telegramID",
  adminAuthMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.telegramUser?.id) {
        res.status(401).json({
          error: "Unauthorized - User not found",
          success: false,
          data: null,
        });
        return;
      }

      if (!req.isAdmin) {
        res.status(403).json({
          error: "Forbidden - Admin access required",
          success: false,
          data: null,
        });
        return;
      }

      if (req.telegramUser.id !== Number(process.env.SUPER_ADMIN_TELEGRAM_ID)) {
        res.status(403).json({
          error: "Forbidden - Only Super Admin can remove admins",
          success: false,
          data: null,
        });
        return;
      }

      if (!mongodb.connected) {
        res.status(503).json({
          error: "Service Unavailable - Database connection error",
          success: false,
          data: null,
        });
        return;
      }

      const { telegramID } = req.params;

      const numericTelegramId = Number(telegramID);
      if (!telegramID || isNaN(numericTelegramId)) {
        res.status(400).json({
          error: "Bad Request - Invalid telegramID",
          success: false,
          data: null,
        });
        return;
      }

      if (numericTelegramId === Number(process.env.SUPER_ADMIN_TELEGRAM_ID)) {
        res.status(403).json({
          error: "Forbidden - Super Admin cannot be deleted",
          success: false,
          data: null,
        });
        return;
      }

      const result = await mongodb.client
        .db("giftApp")
        .collection("admins")
        .deleteOne({ telegramID: numericTelegramId });

      if (!result.deletedCount) {
        res.status(404).json({
          error: "Not Found - Admin does not exist",
          success: false,
          data: null,
        });
        return;
      }

      res.json({
        error: null,
        success: true,
        data: {
          message: "Admin deleted successfully",
        },
      });
    } catch (error) {
      logger.error("Error deleting admin:", error);
      res.status(500).json({
        error: "Internal Server Error",
        success: false,
        data: null,
      });
    }
  }
);

export default router;
