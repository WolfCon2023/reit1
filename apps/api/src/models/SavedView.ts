import mongoose from "mongoose";
import type { SavedViewDocument } from "@reit1/shared";

const savedViewSchema = new mongoose.Schema<SavedViewDocument>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true } as any,
    name: { type: String, required: true },
    resourceType: { type: String, default: "sites" },
    query: { type: mongoose.Schema.Types.Mixed, default: {} },
    columns: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },
    createdBy: String,
  },
  { timestamps: true }
);

savedViewSchema.index({ projectId: 1 });

export const SavedView = mongoose.model<SavedViewDocument>("SavedView", savedViewSchema);
