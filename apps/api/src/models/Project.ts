import mongoose from "mongoose";
import type { ProjectDocument } from "@reit1/shared";

const projectSchema = new mongoose.Schema<ProjectDocument>(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    companyName: String,
    tags: { type: [String], default: [] },
    isArchived: { type: Boolean, default: false },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

projectSchema.index({ isArchived: 1 });

export const Project = mongoose.model<ProjectDocument>("Project", projectSchema);
