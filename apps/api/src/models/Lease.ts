import mongoose from "mongoose";
import type { LeaseDocument } from "@reit1/shared";

const leaseSchema = new mongoose.Schema<LeaseDocument>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true } as any,
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true } as any,
    tenantName: { type: String, required: true },
    leaseStartDate: { type: Date, required: true },
    leaseEndDate: { type: Date, required: true },
    monthlyRent: { type: Number, required: true, min: 0 },
    escalationPercent: { type: Number, min: 0, max: 100 },
    status: { type: String, enum: ["active", "expired", "pending", "terminated"], default: "active" },
    notes: String,
    isDeleted: { type: Boolean, default: false },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true }
);

leaseSchema.index({ projectId: 1, status: 1 });
leaseSchema.index({ projectId: 1, siteId: 1 });
leaseSchema.index({ projectId: 1, leaseEndDate: 1 });

export const Lease = mongoose.model<LeaseDocument>("Lease", leaseSchema);
