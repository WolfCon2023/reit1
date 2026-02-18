import mongoose from "mongoose";
import type { UserDocument } from "@reit1/shared";

const userSchema = new mongoose.Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    mfaEnabled: { type: Boolean, default: false },
    mfaEnforced: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    resetCode: String,
    resetExpiresAt: Date,
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDocument>("User", userSchema);
