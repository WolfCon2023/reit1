import mongoose from "mongoose";
import type { AuditDocument } from "@reit1/shared";

const auditSchema = new mongoose.Schema<AuditDocument>(
  {
    actorUserId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

auditSchema.index({ createdAt: -1 });
auditSchema.index({ action: 1 });
auditSchema.index({ actorUserId: 1 });

export const AuditLog = mongoose.model<AuditDocument>("AuditLog", auditSchema);
