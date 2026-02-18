import { Router } from "express";
import { AuditLog } from "../models/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Logged in",
  "site.create": "Created a site",
  "site.update": "Updated a site",
  "site.delete": "Deleted a site",
  "site.bulk_update": "Bulk updated sites",
  "site.bulk_delete": "Bulk deleted sites",
  "project.create": "Created a project",
  "project.update": "Updated a project",
  "project.archive": "Archived a project",
  "project.unarchive": "Unarchived a project",
  "lease.create": "Created a lease",
  "lease.update": "Updated a lease",
  "lease.delete": "Deleted a lease",
  "document.upload": "Uploaded a document",
  "document.delete": "Deleted a document",
  "view.create": "Saved a view",
  "view.update": "Updated a view",
  "view.delete": "Deleted a view",
  "user.create": "Created a user",
  "user.update": "Updated a user",
  "import.commit": "Committed an import",
  "backup.run": "Ran a backup",
  "renewal.create": "Created a lease renewal request",
  "renewal.approve": "Approved a lease renewal",
  "renewal.reject": "Rejected a lease renewal",
  "photo.upload": "Uploaded a site photo",
  "photo.delete": "Deleted a site photo",
};

router.get("/", requireAuth, async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const projectId = req.query.projectId ? String(req.query.projectId) : undefined;

  const filter: Record<string, unknown> = {
    actorUserId: req.user!.userId,
  };
  if (projectId) {
    filter["metadata.projectId"] = projectId;
  }

  const items = await AuditLog.find(filter)
    .sort("-createdAt")
    .limit(limit)
    .lean();

  const activity = items.map((item) => ({
    _id: item._id,
    action: item.action,
    label: ACTION_LABELS[item.action] ?? item.action,
    actorEmail: item.actorEmail,
    resourceType: item.resourceType,
    resourceId: item.resourceId,
    metadata: item.metadata,
    createdAt: item.createdAt,
  }));

  res.json({ items: activity });
});

export default router;
