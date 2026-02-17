# RBAC: roles and permissions

## Model

- **Permissions** – String constants (e.g. `sites:read`, `users:manage`). Enforced on every API and in the UI.
- **Roles** – Named sets of permissions. Stored in DB; system roles are seeded and protected from deletion.
- **Users** – Have an array of role IDs. Effective permissions = union of all role permissions.

## Permissions (minimum set)

| Permission | Description |
|------------|-------------|
| `sites:read` | List and view sites |
| `sites:write` | Create and update sites |
| `sites:delete` | Soft-delete sites |
| `sites:export` | Export sites CSV |
| `import:run` | Upload xlsx and commit import |
| `import:template:download` | Download import template |
| `users:read` | List users and access Admin → Users |
| `users:manage` | Create, edit, disable/enable users, reset password |
| `roles:read` | List roles and access Admin → Roles |
| `roles:manage` | Create and edit roles (non-system) |
| `audit:read` | View audit log |
| `backups:manage` | Run backup, list backups, prune |

## Seeded roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | All of the above |
| **Admin** | All except (conceptually) none – same as full set: sites, import, users, roles, audit, backups |
| **Data Manager** | sites:read, sites:write, sites:export, import:run, import:template:download |
| **Viewer** | sites:read only |

(Super Admin is the only role that has every permission; Admin has the full listed set; Data Manager and Viewer are subsets as above.)

## How to add a new permission

1. **Shared package:** Add the constant in `packages/shared/src/permissions.ts` to `PERMISSIONS` and to `ALL_PERMISSIONS` if it should be assignable.
2. **API:** Use `requirePermission("new:permission")` on the route(s) that should be gated.
3. **Seed (optional):** Assign the new permission to the appropriate seeded roles in `ROLE_PERMISSIONS` in `packages/shared`.
4. **Web:** Add the constant to `apps/web/src/lib/permissions.ts` and use it in route guards and component visibility (e.g. `hasPermission(PERMISSIONS.NEW_PERMISSION)`).

## Protection rules

- **Super Admin** role cannot be deleted or have its permissions reduced by the UI (backend can reject role delete / demote).
- Roles that are in use (assigned to at least one user) cannot be deleted until assignments are removed.
