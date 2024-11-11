import { config } from "./lib/dotenv";
config();
import { app, initializeApp } from "./lib/connection";
import adminRoutes from "./routes/admin";
import giftRoute from "./routes/gift";
import transactionRoute from "./routes/transaction";
import invoiceRoute from "./routes/invoice";
import userRoute from "./routes/user";
import leaderboardRoute from "./routes/leaderboard";
import { initializeBot } from "./lib/bot";
import { registerCommands } from "./bot/commands";
import { registerHandlers } from "./bot/handlers";
import logger from "./lib/logger";

async function startServer() {
  try {
    // Initialize app with database and middleware first
    await initializeApp();

    // Initialize bot after app is initialized
    const bot = await initializeBot({
      token: process.env.BOT_TOKEN || "",
      environment: process.env.NODE_ENV === "production" ? "prod" : "test",
    });

    // Register commands and handlers
    registerCommands(bot);
    registerHandlers(bot);

    // Then add routes
    app.use("/admin", adminRoutes);
    app.use("/gift", giftRoute);
    app.use("/transaction", transactionRoute);
    app.use("/invoice", invoiceRoute);
    app.use("/user", userRoute);
    app.use("/leaderboard", leaderboardRoute);

    // Start the bot
    bot.start({
      onStart: (botInfo) => {
        logger.info(`@${botInfo.username} is running.`);
      },
    });

    // Start the server
    const PORT = process.env.PORT || 4610;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
