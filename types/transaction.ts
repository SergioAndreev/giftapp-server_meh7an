import { ObjectId } from "mongodb";
import { Gift } from "./gift";

export interface Transaction {
  _id: ObjectId;
  giftId: ObjectId;
  gift: Gift;
  senderId: number;
  receiverId: number;
  sender?: TransactionUser;
  receiver?: TransactionUser;
  status: "PENDING" | "COMPLETED";
  createdAt: Date;
  updatedAt: Date;
  price: number;
  currency: string;
  which?: number;
  event?: TransactionType;
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

export enum TransactionType {
  PURCHASED = "PURCHASED",
  SENT = "SENT",
  RECEIVED = "RECEIVED",
}

export interface TransactionUser {
  firstName: string;
  lastName?: string;
  username?: string | null;
  totalGiftsCount: number;
  isPremium: boolean;
  telegramId: number;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  hasNext: boolean;
}
