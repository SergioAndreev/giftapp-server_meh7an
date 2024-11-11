import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import { DatabaseCollections, initializeDatabase } from "./database";
import logger from "./logger";
import { AppError } from "./logger/errorHandler";
import { createAuthMiddleware } from "./auth";
import { webhookRouter } from "@/routes/webhook";
import path from "node:path";
import { fileURLToPath } from "url";

interface MongoDBConnection {
  client: MongoClient;
  connected: boolean;
  collections?: DatabaseCollections;
}

const app = express();
// app.use(cors());

const corsOptions = {
  origin: "*",
  methods: "*",
  allowedHeaders: "*",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  "/assets",
  express.static(path.join(__dirname, "../assets"), {
    maxAge: "1d",
    immutable: true,
    fallthrough: false,
    index: false,
  })
);

app.use(express.json());

let mongodb: MongoDBConnection = {
  client: null as any,
  connected: false,
};

async function initializeApp() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new AppError("MONGODB_URI is not defined in environment variables");
    }

    const client = new MongoClient(process.env.MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    await client.db("admin").command({ ping: 1 });
    logger.info("Successfully connected to MongoDB.");

    const collections = await initializeDatabase(client);
    mongodb.client = client;
    mongodb.connected = true;
    mongodb.collections = collections;

    app.use("/webhook", webhookRouter);
    const authMiddleware = createAuthMiddleware(collections.usersCollection);
    app.use(authMiddleware); // Apply it globally

    logger.info("Auth middleware initialized successfully");
  } catch (error) {
    logger.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongodb.connected ? "connected" : "disconnected",
  });
});

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

export { app, mongodb, initializeApp };
