import { z } from "zod";

export const leaseCreateSchema = z.object({
  tenantName: z.string().min(1, "Tenant name is required").max(300),
  leaseStartDate: z.string().min(1, "Start date is required"),
  leaseEndDate: z.string().min(1, "End date is required"),
  monthlyRent: z.number().min(0, "Monthly rent must be non-negative"),
  escalationPercent: z.number().min(0).max(100).optional(),
  status: z.enum(["active", "expired", "pending", "terminated"]).default("active"),
  notes: z.string().max(5000).optional(),
});

export const leaseUpdateSchema = leaseCreateSchema.partial();

export type LeaseCreate = z.infer<typeof leaseCreateSchema>;
export type LeaseUpdate = z.infer<typeof leaseUpdateSchema>;
