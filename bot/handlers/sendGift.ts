import { base64ToHex } from "@/lib/base64ToHex";
import { mongodb } from "@/lib/connection";
import { Context, InlineQueryResultBuilder } from "grammy";

export async function sendGift(ctx: Context) {
  if (!ctx.inlineQuery) {
    return;
  }

  const query = ctx.inlineQuery.query;
  if (query.length !== 16) {
    console.log("Invalid query");
    ctx.answerInlineQuery([]);
    return;
  }

  const sender = ctx.inlineQuery.from?.id;
  const db = mongodb.client.db("giftApp");
  const userCol = db.collection("users");
  // search in the database for the gifts with same name as query
  const user = await userCol.findOne({ telegramId: sender });

  if (!user) {
    console.log("User not found");
    ctx.answerInlineQuery([]);
    return;
  }

  const transactionId = base64ToHex(query);
  const transaction = user.transactions.find(
    (t: import("mongodb").ObjectId) => t.toHexString() === transactionId
  );

  if (!transaction) {
    console.log("Transaction not found");
    ctx.answerInlineQuery([]);
    return;
  }

  const transactionCol = db.collection("transactions");
  const transactionDoc = await transactionCol.findOne({
    _id: transaction,
  });

  if (!transactionDoc) {
    console.log("Transaction doc not found");
    ctx.answerInlineQuery([]);
    return;
  }

  const giftId = transactionDoc.giftId;
  const giftCol = db.collection("gifts");
  const gift = await giftCol.findOne({ _id: giftId });

  if (!gift) {
    console.log("Gift not found");
    ctx.answerInlineQuery([]);
    return;
  }

  if (!process.env.WEBAPP_URL) {
    console.log("Webapp URL not set");
    ctx.answerInlineQuery([]);
    return;
  }

  const results = [
    InlineQueryResultBuilder.article(transaction.toString(), "Send Gift", {
      description: `Send a gift of ${gift.name}`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Receive Gift",
              url: `${process.env.WEBAPP_URL}?startapp=${transaction}-${sender}`,
            },
          ],
        ],
      },
    }).text(
      "🎁 I have a <b>gift</b> for you! Tap the button below to open it.",
      {
        parse_mode: "HTML",
      }
    ),
  ];

  await ctx.answerInlineQuery(results);
}
