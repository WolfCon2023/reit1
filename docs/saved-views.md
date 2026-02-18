# Saved Views & Bulk Operations

## Saved Views

Users with `views:manage` permission can save filter/sort configurations for the Sites table.

### Data Model
- `projectId` - Parent project
- `name` - View name
- `resourceType` - Currently only "sites"
- `query` - JSON object storing filter state (search, state, provider, etc.)
- `columns` - Optional column list (for future column customization)
- `isDefault` - Whether this is the default view for the project

### API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/projects/:pid/views` | `views:manage` | List saved views |
| POST | `/api/projects/:pid/views` | `views:manage` | Create view |
| PUT | `/api/projects/:pid/views/:viewId` | `views:manage` | Update view |
| DELETE | `/api/projects/:pid/views/:viewId` | `views:manage` | Delete view |

## Bulk Operations

### Endpoint
`POST /api/projects/:pid/sites/bulk`

### Body
```json
{
  "action": "update" | "delete",
  "siteIds": ["id1", "id2", ...],
  "patch": { "field": "value" }  // required for "update"
}
```

### Allowed bulk-update fields
- `structureTypeValue`, `provider`, `stateValue`, `ge`, `siteType`

### Permissions
- `sites:write` required for bulk update
- `sites:delete` required for bulk delete

All bulk operations are audit-logged with count and field names.

## Frontend

The Sites page includes:
- Checkbox column for row selection
- "Bulk Actions" bar when rows selected (Update Field, Delete Selected)
- "Saved Views" buttons above filters with "Save Current View" option
