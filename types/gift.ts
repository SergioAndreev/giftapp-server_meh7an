import { BaseDocument } from "@/lib/transformer";
import { ObjectId } from "mongodb";

export interface Gift extends BaseDocument {
  _id: ObjectId;
  name: string;
  slug: string;
  price: number;
  currency: string;
  totalAvailable: number;
  sold: number;
  color: string;
  patternID: string;
  lottieID: string;
}
