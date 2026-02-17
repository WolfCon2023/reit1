export const PERMISSIONS = {
  SITES_READ: "sites:read",
  SITES_WRITE: "sites:write",
  SITES_DELETE: "sites:delete",
  SITES_EXPORT: "sites:export",
  IMPORT_RUN: "import:run",
  IMPORT_TEMPLATE_DOWNLOAD: "import:template:download",
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
  ROLES_READ: "roles:read",
  ROLES_MANAGE: "roles:manage",
  AUDIT_READ: "audit:read",
  BACKUPS_MANAGE: "backups:manage",
} as const;
