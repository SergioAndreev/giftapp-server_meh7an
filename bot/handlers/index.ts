import { Bot, Context } from "grammy";
import { giftPurchased } from "./notifications";
import { sendGift } from "./sendGift";

export function registerHandlers(bot: Bot<Context>) {
  // Register all handlers
  bot.on("message", giftPurchased);
  bot.on("inline_query", sendGift);
  // Error handler
  bot.catch((err) => {
    console.error("An error occurred in the bot:", err);
  });
}
