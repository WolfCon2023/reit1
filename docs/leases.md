# Lease & Revenue Engine

## Data Model

The `Lease` model tracks tenant lease agreements attached to specific sites within a project.

### Fields
- `projectId` - Reference to the parent project
- `siteId` - Reference to the specific site
- `tenantName` - Name of the leasing tenant
- `leaseStartDate` / `leaseEndDate` - Lease term dates
- `monthlyRent` - Monthly rental amount (USD)
- `escalationPercent` - Annual rent escalation percentage (0-100)
- `status` - One of: `active`, `expired`, `pending`, `terminated`
- `notes` - Free-text notes
- `isDeleted` - Soft-delete flag

### Indexes
- `{ projectId, status }` - Filter by status within project
- `{ projectId, siteId }` - Lookup leases for a site
- `{ projectId, leaseEndDate }` - Expiration alerts

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/projects/:pid/leases` | `leases:read` | List leases (paginated, filterable) |
| GET | `/api/projects/:pid/leases/alerts?windowDays=90` | `leases:read` | Leases expiring within window |
| POST | `/api/projects/:pid/leases/:siteId` | `leases:write` | Create lease for a site |
| PUT | `/api/projects/:pid/leases/:leaseId` | `leases:write` | Update lease |
| DELETE | `/api/projects/:pid/leases/:leaseId` | `leases:delete` | Soft-delete lease |

## Revenue Summary

`GET /api/projects/:pid/revenue/summary` returns:
- `totalMonthlyRent` - Sum of active leases
- `totalAnnualizedRent` - Monthly x 12
- `leasesExpiringIn30/60/90` - Counts of expiring leases
- `revenueByTenant` - Top 10 tenants by monthly rent

## Frontend Pages
- `/projects/:pid/leases` - Lease list with revenue summary cards
- `/projects/:pid/leases/new` - Create lease form
- `/projects/:pid/leases/:id/edit` - Edit lease form
- Lease section on Site Detail page
- Revenue cards on Project Dashboard
