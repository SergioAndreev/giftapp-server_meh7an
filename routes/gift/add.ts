import { Router } from "express";
import { AuthenticatedRequest } from "@/lib/auth";
import { adminAuthMiddleware } from "@/lib/adminAuth";
import { mongodb } from "@/lib/connection";
import { Gift } from "@/types/gift";
import { ObjectId } from "mongodb";

const router = Router();

const generateBaseSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const findUniqueSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existingGift = await mongodb.client
      .db("giftApp")
      .collection("gifts")
      .findOne({ slug });

    if (!existingGift) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
};

router.post(
  "/add",
  adminAuthMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.telegramUser?.id) {
        res.status(500).json({
          error: "User not found",
          success: false,
          data: null,
        });
        return;
      }

      if (!req.isAdmin) {
        res.status(403).json({
          error: "Unauthorized",
          success: false,
          data: null,
        });
        return;
      }

      if (!mongodb.connected) {
        res.status(500).json({
          error: "Database is not connected",
          success: false,
          data: null,
        });
        return;
      }

      const {
        name,
        price,
        currency,
        totalAvailable,
        color,
        patternID,
        lottieID,
      } = req.body;

      if (
        !name ||
        !price ||
        !currency ||
        !totalAvailable ||
        !color ||
        !patternID ||
        !lottieID
      ) {
        res.status(400).json({
          error: "All fields are required",
          success: false,
          data: null,
        });
        return;
      }

      if (typeof price !== "number" || price < 0) {
        res.status(400).json({
          error: "Price must be a positive number.",
          success: false,
          data: null,
        });
        return;
      }

      if (typeof totalAvailable !== "number" || totalAvailable < 0) {
        res.status(400).json({
          error: "Total available must be a positive number.",
          success: false,
          data: null,
        });
        return;
      }

      const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!colorRegex.test(color)) {
        res.status(400).json({
          error: "Color must be a valid hex color, starting with '#'.",
          success: false,
          data: null,
        });
        return;
      }

      // Generate unique slug
      const baseSlug = generateBaseSlug(name);
      const uniqueSlug = await findUniqueSlug(baseSlug);

      const gift: Gift = {
        _id: new ObjectId(),
        name,
        slug: uniqueSlug,
        price,
        currency,
        totalAvailable,
        sold: 0,
        color,
        patternID,
        lottieID,
      };

      const result = await mongodb.client
        .db("giftApp")
        .collection("gifts")
        .insertOne(gift);

      const insertedGift = await mongodb.client
        .db("giftApp")
        .collection("gifts")
        .findOne({ _id: result.insertedId });

      if (!insertedGift) {
        res.status(500).json({
          error: "Failed to add the gift.",
          success: false,
          data: null,
        });
        return;
      }

      res.json({
        error: null,
        success: true,
        data: insertedGift,
      });
    } catch (error) {
      console.error("Error adding the gift:", error);
      res.status(500).json({
        error: "Internal server error",
        success: false,
        data: null,
      });
    }
  }
);

export default router;
