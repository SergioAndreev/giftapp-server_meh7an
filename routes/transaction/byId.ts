import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { mongodb } from "@/lib/connection";
import logger from "@/lib/logger";
import { ObjectId } from "mongodb";
import { User } from "@/types/user";
import { giftListService } from "@/services/giftList.service";
import { getTransactionWithGift } from "@/lib/transactionWithGift";
import { Transaction } from "@/types/transaction";
import { bot } from "@/lib/bot";

const router = Router();

router.get("/:id/:senderId", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.telegramUser?.id;

    if (!userId) {
      res.status(401).json({
        error: "User not authenticated",
        success: false,
        data: null,
      });
      return;
    }

    const { id, senderId } = req.params;
    const senderIdInt = parseInt(senderId, 10);

    const transactionsCol = mongodb.client
      .db("giftApp")
      .collection<Transaction>("transactions");

    const transaction = await transactionsCol.findOne({
      _id: new ObjectId(id),
      senderId: senderIdInt,
      status: "COMPLETED",
    });

    if (!transaction) {
      res.status(404).json({
        error: "Transaction not found",
        success: false,
        data: null,
      });
      return;
    }

    if (transaction.receiverId !== 0) {
      const usersCol = mongodb.client.db("giftApp").collection<User>("users");

      const [sender, receiver] = await Promise.all([
        usersCol.findOne({ telegramId: transaction.senderId }),
        usersCol.findOne({ telegramId: transaction.receiverId }),
      ]);

      const transactionWithGift = await getTransactionWithGift(
        transactionsCol,
        new ObjectId(id)
      );

      res.json({
        error: null,
        success: true,
        data: {
          ...transactionWithGift,
          sender,
          receiver,
        },
      });
      return;
    }

    await transactionsCol.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          receiverId: userId,
          updatedAt: new Date(),
        },
      }
    );

    const usersCol = mongodb.client.db("giftApp").collection<User>("users");

    const result = await usersCol.findOneAndUpdate(
      {
        telegramId: userId,
      },
      {
        $addToSet: {
          gifts: new ObjectId(id),
          transactions: new ObjectId(id),
        },
      },
      { returnDocument: "after" }
    );

    const giftCount = result?.gifts.length;

    await usersCol.updateOne(
      {
        telegramId: userId,
      },
      {
        $set: {
          totalGiftsCount: giftCount,
        },
      }
    );

    await usersCol.updateOne(
      {
        telegramId: senderIdInt,
      },
      {
        $pull: {
          pendingGifts: new ObjectId(id),
        },
      }
    );

    const sender = await usersCol.findOne({ telegramId: senderIdInt });

    const transactionWithGift = await getTransactionWithGift(
      transactionsCol,
      new ObjectId(id)
    );

    bot.api.sendMessage(
      transaction.receiver?.telegramId || userId,
      `You got the gift <b>${transactionWithGift?.gift.name}</b> from <b>${
        sender?.username
          ? `<a href="https://t.me/${sender.username}">${sender.firstName}</a>`
          : sender?.firstName
      }</b>! 🎉`,
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

    const receiver = await usersCol.findOne({
      telegramId: transaction.receiver?.telegramId || userId,
    });

    bot.api.sendMessage(
      transaction.senderId,
      `Your gift <b>${transactionWithGift?.gift.name}</b> to <b>${
        receiver?.username
          ? `<a href="https://t.me/${receiver.username}">${receiver.firstName}</a>`
          : receiver?.firstName || "the user"
      }</b> is successfully delivered! 🎉`,
      {
        parse_mode: "HTML",
      }
    );

    res.json({
      error: null,
      success: true,
      data: {
        ...transactionWithGift,
        sender,
      },
    });
  } catch (error) {
    logger.error("Error handling gift transaction:", error);
    res.status(500).json({
      error: "Internal server error",
      success: false,
      data: null,
    });
  }
});

export default router;
