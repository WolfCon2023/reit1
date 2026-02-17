import mongoose from "mongoose";
import type { ZipCacheDocument } from "@reit1/shared";

const zipCacheSchema = new mongoose.Schema<ZipCacheDocument>(
  {
    zip: { type: String, required: true, unique: true },
    city: String,
    state: String,
    county: String,
  },
  { timestamps: true }
);

export const ZipCache = mongoose.model<ZipCacheDocument>("ZipCache", zipCacheSchema);
