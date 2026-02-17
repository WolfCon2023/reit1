import mongoose from "mongoose";
import type { RoleDocument } from "@reit1/shared";

const roleSchema = new mongoose.Schema<RoleDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    permissions: [String],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model<RoleDocument>("Role", roleSchema);
