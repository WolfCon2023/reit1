import { AuditLog } from "../models/index.js";
import type { RequestUser } from "@reit1/shared";

const METADATA_MAX_KEYS = 20;
const METADATA_VALUE_MAX_LEN = 500;

function truncateMetadata(obj: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(obj).slice(0, METADATA_MAX_KEYS);
  const out: Record<string, unknown> = {};
  for (const [k, v] of entries) {
    if (typeof v === "string" && v.length > METADATA_VALUE_MAX_LEN) {
      out[k] = v.slice(0, METADATA_VALUE_MAX_LEN) + "...";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function logAudit(
  user: RequestUser,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await AuditLog.create({
      actorUserId: user.userId,
      actorEmail: user.email,
      action,
      resourceType,
      resourceId,
      metadata: metadata ? truncateMetadata(metadata as Record<string, unknown>) : undefined,
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
