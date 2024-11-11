import { Bot, Context, session, SessionFlavor } from "grammy";
import { BotConfig } from "@/types/bot";

export let bot: Bot<Context>;

export async function initializeBot(config: BotConfig) {
  bot = new Bot<Context>(config.token, {
    client: {
      environment: "prod",
    },
  });

  return bot;
}
