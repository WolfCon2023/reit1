# Document & Compliance Management

## Overview

The document system allows uploading, organizing, and tracking compliance documents (permits, leases, engineering reports, etc.) per project or per site.

## Storage

Documents are stored on a local volume mount. Default path: `/data/uploads`.

### Configuration
- `DOCUMENT_UPLOAD_DIR` - Directory for file storage (default: `/data/uploads`)
- `DOCUMENT_MAX_MB` - Maximum upload size in MB (default: 25)

Files are organized as: `{uploadDir}/{projectId}/{uuid}-{filename}`

## Data Model

### Fields
- `projectId` - Parent project
- `siteId` - Optional site association
- `category` - One of: Permit, Zoning, Lease, Engineering, Insurance, Other
- `title` - Human-readable title
- `filename` - Original filename
- `mimeType` - File MIME type
- `sizeBytes` - File size in bytes
- `storagePath` - Path on disk
- `expiresAt` - Optional expiration date for compliance tracking
- `version` - Version number (default: 1)
- `isDeleted` - Soft-delete flag

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/projects/:pid/documents` | `documents:read` | List documents (paginated) |
| POST | `/api/projects/:pid/documents` | `documents:write` | Upload document (multipart) |
| POST | `/api/projects/:pid/documents/:siteId/upload` | `documents:write` | Upload for specific site |
| GET | `/api/projects/:pid/documents/:docId/download` | `documents:read` | Download file |
| DELETE | `/api/projects/:pid/documents/:docId` | `documents:delete` | Soft-delete document |

## Frontend
- `/projects/:pid/documents` - Document list with upload form
- Document section on Site Detail page
- "Documents expiring soon" info on Project Dashboard
