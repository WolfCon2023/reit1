import mongoose from "mongoose";
import type { ImportBatchDocument } from "@reit1/shared";

const MAX_ERROR_DETAILS = 500;
const MAX_VALID_ROWS = 10000;

const errorDetailSchema = new mongoose.Schema(
  {
    row: Number,
    errors: [String],
  },
  { _id: false }
);

const importBatchSchema = new mongoose.Schema<ImportBatchDocument>(
  {
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    filename: { type: String, required: true },
    totalRows: { type: Number, required: true },
    importedRows: { type: Number, default: 0 },
    errorRows: { type: Number, default: 0 },
    errorDetails: {
      type: [errorDetailSchema],
      default: [],
      validate: (v: unknown[]) => v.length <= MAX_ERROR_DETAILS,
    },
    validRows: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      validate: (v: unknown[]) => v.length <= MAX_VALID_ROWS,
    },
    status: { type: String, enum: ["pending", "committed", "partial"], default: "pending" },
  },
  { timestamps: true }
);

importBatchSchema.index({ uploadedAt: -1 });

export const ImportBatch = mongoose.model<ImportBatchDocument>("ImportBatch", importBatchSchema);
