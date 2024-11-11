import { ObjectId } from "mongodb";

export enum AdminRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
}

export interface Admin {
  _id?: ObjectId;
  name: string;
  telegramID: number;
  addedBy: number;
  addedAt: Date;
  isActive: boolean;
  role: AdminRole;
}
