import { Bot, Context } from "grammy";
import { start } from "./start";

export function registerCommands(bot: Bot<Context>) {
  bot.command("start", start);
}
