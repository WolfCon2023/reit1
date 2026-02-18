import mongoose from "mongoose";

export interface LeaseRenewalDocument {
  _id: string;
  projectId: string;
  leaseId: string;
  siteId: string;
  tenantName: string;
  currentEndDate: Date;
  proposedEndDate: Date;
  proposedMonthlyRent: number;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaseRenewalSchema = new mongoose.Schema<LeaseRenewalDocument>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true } as any,
    leaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Lease", required: true } as any,
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: "Site", required: true } as any,
    tenantName: { type: String, required: true },
    currentEndDate: { type: Date, required: true },
    proposedEndDate: { type: Date, required: true },
    proposedMonthlyRent: { type: Number, required: true, min: 0 },
    notes: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    requestedBy: { type: String, required: true },
    reviewedBy: String,
    reviewedAt: Date,
    reviewNotes: String,
  },
  { timestamps: true }
);

leaseRenewalSchema.index({ projectId: 1, status: 1 });
leaseRenewalSchema.index({ leaseId: 1 });

export const LeaseRenewal = mongoose.model<LeaseRenewalDocument>("LeaseRenewal", leaseRenewalSchema);
