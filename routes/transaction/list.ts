import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";

const router = Router();

router.get("/list/:slug", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.telegramUser?.id) {
      res.status(401).json({
        error: "User not authenticated",
        success: false,
        data: null,
      });
      return;
    }

    const { slug } = req.params;

    const gift = await mongodb.client
      .db("giftApp")
      .collection("gifts")
      .findOne({ slug });

    if (!gift) {
      res.status(404).json({
        error: "Gift not found",
        success: false,
        data: null,
      });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const transactionsCount = await mongodb.client
      .db("giftApp")
      .collection("transactions")
      .countDocuments({
        giftId: gift._id,
        userId: req.telegramUser.id,
      });

    if (page < 1 || (page - 1) * limit > transactionsCount) {
      res.json({
        error: null,
        success: true,
        data: {
          transactions: [],
          hasNext: false,
        },
      });
      return;
    }

    const transactions = await mongodb.client
      .db("giftApp")
      .collection("transactions")
      .find({
        giftId: gift._id,
        userId: req.telegramUser.id,
      })
      .sort({ createdAt: -1 }) // Most recent first
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const transformedTransactions = transactions.map((transaction) => ({
      id: transaction._id.toString(),
      giftId: transaction.giftId.toString(),
      userId: transaction.userId,
      amount: transaction.amount,
      status: transaction.status,
      createdAt: transaction.createdAt,
    }));

    res.json({
      error: null,
      success: true,
      data: {
        transactions: transformedTransactions,
        hasNext: transactionsCount > page * limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching transactions:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
