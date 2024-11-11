import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { AppError } from "@/lib/logger/errorHandler";
import { TransactionStatus } from "@/types/transaction";
import { User } from "@/types/user";

const router = Router();

const cryptoPayConfig: CryptoPayConfig = {
  apiToken: process.env.CRYPTOPAY_API_KEY || "",
  apiEndpoint: process.env.CRYPTOPAY_API_ENDPOINT || "",
  appUrl: process.env.APP_URL || "",
};

if (
  !cryptoPayConfig.apiToken ||
  !cryptoPayConfig.apiEndpoint ||
  !cryptoPayConfig.appUrl
) {
  throw new Error("Missing required environment variables for CryptoPay");
}

router.post(
  "/create-invoice/:giftId",
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.telegramUser?.id) {
        res.status(401).json({
          error: "User not authenticated",
          success: false,
          data: null,
        });
        return;
      }

      const { giftId } = req.params;

      const gift = await mongodb.client
        .db("giftApp")
        .collection("gifts")
        .findOne({ _id: new ObjectId(giftId) });

      if (!gift) {
        res.status(404).json({
          error: "Gift not found",
          success: false,
          data: null,
        });
        return;
      }
      const url = `${cryptoPayConfig.apiEndpoint}/createInvoice`;
      const response = await fetch(
        `${cryptoPayConfig.apiEndpoint}/createInvoice`,
        {
          method: "POST",
          headers: {
            "Crypto-Pay-API-Token": cryptoPayConfig.apiToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currency_type: "crypto",
            asset: gift.currency,
            accepted_assets: "USDT,TON,BTC,ETH",
            amount: gift.price.toString(),
            description: `Purchasing a ${gift.name} gift`,
            payload: JSON.stringify({
              giftId: gift._id.toString(),
              userId: req.telegramUser.id,
            }),
            expires_in: 3600,
            allow_comments: false,
            allow_anonymous: false,
          }),
        }
      );

      const data = await response.json();

      if (!data.ok) {
        res.status(500).json({
          error: data.error || "Failed to create invoice",
          success: false,
          data: null,
        });
        throw new AppError(data.error || "Failed to create invoice");
      }

      const transactionResult = await mongodb.client
        .db("giftApp")
        .collection("transactions")
        .insertOne({
          giftId: new ObjectId(giftId),
          senderId: req.telegramUser.id,
          receiverId: 0,
          status: TransactionStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          paymentId: data.result.invoice_id,
          price: gift.price,
          currency: gift.currency,
        });

      await mongodb.client
        .db("giftApp")
        .collection<User>("users")
        .updateOne(
          { telegramId: req.telegramUser.id },
          {
            $push: {
              transactions: transactionResult.insertedId,
            },
            $set: { updatedAt: new Date() },
          }
        );

      res.json({
        error: null,
        success: true,
        data: {
          paymentUrl: data.result.bot_invoice_url,
          webAppUrl: data.result.web_app_invoice_url,
          miniAppUrl: data.result.mini_app_invoice_url,
          paymentId: data.result.invoice_id,
        },
      });
    } catch (error) {
      logger.error("Error creating invoice:", error);
      res.status(500).json({
        error: "Internal server error",
        success: false,
        data: null,
      });
    }
  }
);

router.get("/status/:invoiceId", async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.telegramUser?.id) {
      res.status(401).json({
        error: "User not authenticated",
        success: false,
        data: null,
      });
      return;
    }

    const { invoiceId } = req.params;

    const transaction = await mongodb.client
      .db("giftApp")
      .collection("transactions")
      .findOne({
        paymentId: parseInt(invoiceId),
        senderId: req.telegramUser.id,
      });

    if (!transaction) {
      res.status(404).json({
        error: "Transaction not found",
        success: false,
        data: null,
      });
      return;
    }

    res.json({
      error: null,
      success: true,
      data: {
        status: transaction.status,
        price: transaction.price,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error fetching payment status:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
