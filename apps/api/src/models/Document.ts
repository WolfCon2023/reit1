import mongoose from "mongoose";
import type { DocumentRecord } from "@reit1/shared";

const documentSchema = new mongoose.Schema<DocumentRecord>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true } as any,
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site" } as any,
    category: {
      type: String,
      enum: ["Permit", "Zoning", "Lease", "Engineering", "Insurance", "Other"],
      required: true,
    },
    title: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageProvider: { type: String, default: "local-volume" },
    storagePath: { type: String, required: true },
    expiresAt: Date,
    version: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

documentSchema.index({ projectId: 1, category: 1 });
documentSchema.index({ projectId: 1, siteId: 1 });
documentSchema.index({ projectId: 1, expiresAt: 1 });

export const Document = mongoose.model<DocumentRecord>("Document", documentSchema);
