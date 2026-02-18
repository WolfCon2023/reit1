import { Router } from "express";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";
import { isAuditEnabled, setAuditEnabled } from "../../lib/audit.js";

const router = Router();

router.get("/", requireAuth, requirePermission(PERMISSIONS.AUDIT_READ), async (_req, res) => {
  res.json({
    auditLoggingEnabled: isAuditEnabled(),
  });
});

router.put("/", requireAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), async (req, res) => {
  const { auditLoggingEnabled } = req.body;
  if (typeof auditLoggingEnabled === "boolean") {
    setAuditEnabled(auditLoggingEnabled);
  }
  res.json({
    auditLoggingEnabled: isAuditEnabled(),
  });
});

export default router;
