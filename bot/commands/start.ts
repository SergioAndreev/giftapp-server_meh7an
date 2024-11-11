import { Context } from "grammy";

export async function start(ctx: Context) {
  await ctx.reply(
    "Welcome to the Gift Mini App! Use our webapp to send and receive gifts.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Webapp",
              url: `${process.env.WEBAPP_URL}`,
            },
          ],
        ],
      },
    }
  );
}
