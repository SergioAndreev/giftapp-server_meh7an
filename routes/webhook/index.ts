import express from "express";
import { createHash, createHmac } from "crypto";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { WebhookPayload } from "@/types/webhook";
import { User } from "@/types/user";
import { ObjectId } from "mongodb";
import { Gift } from "@/types/gift";
import { Transaction } from "@/types/transaction";
import { bot } from "@/lib/bot";

const debugWebhook = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const debugData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    signature: req.headers["crypto-pay-api-signature"],
    query: req.query,
  };

  console.log("🔍 Webhook Debug Info:", JSON.stringify(debugData, null, 2));

  const rawBody = JSON.stringify(req.body);
  console.log("📝 Raw Body:", rawBody);

  if (
    process.env.CRYPTOPAY_API_KEY &&
    req.headers["crypto-pay-api-signature"]
  ) {
    const secret = createHash("sha256")
      .update(process.env.CRYPTOPAY_API_KEY)
      .digest();
    const calculatedHmac = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    console.log("🔐 Signature Comparison:", {
      received: req.headers["crypto-pay-api-signature"],
      calculated: calculatedHmac,
      matches: calculatedHmac === req.headers["crypto-pay-api-signature"],
    });
  }

  const oldSend = res.send;
  res.send = function (data) {
    console.log("📤 Response Data:", data);
    return oldSend.apply(res, [data]);
  };

  next();
};

const verifyWebhookSignature = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const signature = req.headers["crypto-pay-api-signature"];
    if (!signature) {
      logger.error("Missing crypto-pay-api-signature header");
      res.status(401).json({ error: "Missing signature" });
      return;
    }

    if (!process.env.CRYPTOPAY_API_KEY) {
      logger.error("CRYPTO_PAY_TOKEN not configured");
      res.status(500).json({ error: "Server configuration error" });
      return;
    }

    const secret = createHash("sha256")
      .update(process.env.CRYPTOPAY_API_KEY)
      .digest();

    const checkString = JSON.stringify(req.body);
    const hmac = createHmac("sha256", secret).update(checkString).digest("hex");

    if (hmac !== signature) {
      logger.error("Invalid webhook signature");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    const requestDate = new Date(req.body.request_date);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (now.getTime() - requestDate.getTime() > fiveMinutes) {
      logger.error("Webhook request too old");
      res.status(401).json({ error: "Request too old" });
      return;
    }

    next();
  } catch (error) {
    logger.error("Error verifying webhook signature:", error);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
};

const webhookRouter = express.Router();

// Apply debug middleware to all webhook routes
// webhookRouter.use(debugWebhook);

webhookRouter.use(verifyWebhookSignature);

webhookRouter.post("/", async (req: express.Request, res: express.Response) => {
  try {
    const webhookData = req.body as WebhookPayload;
    if (webhookData.update_type !== "invoice_paid") {
      throw new Error("Invalid update type");
    }

    const paymentId = webhookData.payload.invoice_id;
    const paidAt = new Date(webhookData.payload.paid_at);
    const payload = JSON.parse(webhookData.payload.payload);
    const giftId = payload.giftId as string;
    const userId = payload.userId as number;

    const existingTransaction = await mongodb.client
      .db("giftApp")
      .collection<Transaction>("transactions")
      .findOne({ paymentId, status: "COMPLETED" });

    if (existingTransaction) {
      res.status(200).json({ status: "already processed" });
      return;
    }

    const giftCol = mongodb.client.db("giftApp").collection<Gift>("gifts");
    const gift = await giftCol.findOne({ _id: new ObjectId(giftId) });

    if (!gift || gift.sold >= gift.totalAvailable) {
      throw new Error("Gift sold out");
    }

    const transactionCol = mongodb.client
      .db("giftApp")
      .collection<Transaction>("transactions");
    const transactionResult = await transactionCol.findOneAndUpdate(
      { paymentId },
      {
        $set: {
          giftId: new ObjectId(giftId),
          senderId: userId,
          receiverId: 0,
          status: "COMPLETED" as const,
          createdAt: paidAt,
          updatedAt: paidAt,
          paymentId: paymentId,
          totalAvailable: gift.totalAvailable,
          which: gift.sold + 1,
        },
      },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    if (!transactionResult?._id) {
      throw new Error("Transaction creation failed");
    }

    const giftUpdate = await giftCol.findOneAndUpdate(
      {
        _id: new ObjectId(giftId),
        sold: { $lt: gift.totalAvailable },
      },
      { $inc: { sold: 1 } },
      { returnDocument: "after" }
    );

    if (!giftUpdate) {
      throw new Error("Gift update failed");
    }

    const userCol = mongodb.client.db("giftApp").collection<User>("users");
    const userUpdate = await userCol.updateOne(
      { telegramId: userId },
      {
        $addToSet: {
          pendingGifts: transactionResult._id,
          transactions: transactionResult._id,
        },
        $setOnInsert: {
          firstName: payload.firstName || "Unknown",
          isPremium: false,
          gifts: [],
          totalGiftsCount: 0,
          createdAt: paidAt,
        },
        $set: {
          updatedAt: paidAt,
        },
      },
      { upsert: true }
    );

    if (!userUpdate.acknowledged) {
      throw new Error("User update failed");
    }

    if (gift?.name && userId) {
      try {
        await bot.api.sendMessage(
          userId,
          `The <b>${gift.name}</b> has been purchased successfully! 🎉`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Open Gift",
                    url: `${process.env.WEBAPP_URL}`,
                  },
                ],
              ],
            },
          }
        );
      } catch (error) {
        logger.error("Failed to send notification:");
        logger.error(error);
      }
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    logger.error("Error processing webhook:");
    logger.error(error);

    if (
      error instanceof Error &&
      (error.message === "Gift sold out" ||
        error.message === "Invalid update type")
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export { webhookRouter };
