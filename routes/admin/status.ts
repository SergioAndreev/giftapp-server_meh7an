import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { adminAuthMiddleware } from "@/lib/adminAuth";

const router = Router();

router.get(
  "/status",
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
      res.json({
        error: null,
        success: true,
        data: {
          isAdmin: req.isAdmin,
          isSuperAdmin:
            req.telegramUser?.id ===
            Number(process.env.SUPER_ADMIN_TELEGRAM_ID),
        },
      });
    } catch (error) {
      console.error("Error getting admin status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
