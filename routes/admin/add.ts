import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { adminAuthMiddleware } from "@/lib/adminAuth";
import { mongodb } from "@/lib/connection";
import { Admin, AdminRole } from "@/types/admin";

const router = Router();

router.post(
  "/add",
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

      if (!mongodb.connected) {
        res.status(500).json({
          error: "Database is not connected",
          success: false,
          data: null,
        });
        return;
      }

      const { name, telegramID } = req.body;

      if (!name || !telegramID) {
        res.status(400).json({
          error: "Name and telegramID are required",
          success: false,
          data: null,
        });
        return;
      }

      const adderId = req.telegramUser?.id;

      const isSuperAdmin =
        adderId === Number(process.env.SUPER_ADMIN_TELEGRAM_ID);

      const admin: Admin = {
        name,
        telegramID,
        addedBy: req.telegramUser?.id,
        addedAt: new Date(),
        isActive: true,
        role: isSuperAdmin ? AdminRole.ADMIN : AdminRole.MODERATOR,
      };

      const result = await mongodb.client
        .db("giftApp")
        .collection("admins")
        .insertOne(admin);

      const insertedAdmin = await mongodb.client
        .db("giftApp")
        .collection("admins")
        .findOne({ _id: result.insertedId });

      if (!insertedAdmin) {
        res
          .status(500)
          .json({ error: "Failed to add admin", success: false, data: null });
      }

      res.json({
        error: null,
        success: true,
        data: insertedAdmin,
      });
    } catch (error) {
      console.error("Error adding admin:", error);
      res
        .status(500)
        .json({ error: "Internal server error", success: false, data: null });
    }
  }
);

export default router;
