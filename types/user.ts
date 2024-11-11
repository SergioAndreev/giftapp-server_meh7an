import { BaseDocument } from "@/lib/transformer";
import { ObjectId } from "mongodb";

export interface User {
  _id: ObjectId;
  telegramId: number;
  username?: string | null;
  firstName: string;
  lastName?: string;
  isPremium: boolean;
  gifts: ObjectId[];
  transactions: ObjectId[];
  pendingGifts: ObjectId[];
  totalGiftsCount: number;
  createdAt: Date;
  updatedAt: Date;
}
