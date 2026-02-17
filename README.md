# REIT Site Data Intake, Import, and Administration

Enterprise-grade REIT (Real Estate Investment Trust) Site Data system with RBAC, Admin Portal, auditability, and Railway deployment.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), React Router, TanStack Query, Zustand, Zod
- **Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Zod, JWT, bcrypt
- **Monorepo:** `apps/web`, `apps/api`, `packages/shared`

## Local development

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

```bash
npm install
cd packages/shared && npm run build
cd ../..
```

### Environment variables

**API (`apps/api`)**

Create `apps/api/.env` (or set in shell):

- `NODE_ENV=development`
- `PORT=3001`
- `MONGODB_URI=mongodb://localhost:27017/reit1`
- `JWT_SECRET=<long-random-string>`
- `CORS_ORIGIN=http://localhost:5173`
- `UPLOAD_MAX_MB=10`
- `BACKUP_DIR=./data/backups`
- `BACKUP_RETENTION_DAYS=30`
- `SEED_ADMIN_EMAIL=admin@example.com`
- `SEED_ADMIN_PASSWORD=<secure-password>`
- `SEED_ADMIN_NAME=Super Admin` (optional)

**Web (`apps/web`)**

Create `apps/web/.env`:

- `VITE_API_URL=` (leave empty when using Vite proxy in dev; set to API URL in production)

### Run

**Terminal 1 – API**

```bash
npm run dev:api
```

**Terminal 2 – Web**

```bash
npm run dev:web
```

- Web: http://localhost:5173  
- API: http://localhost:3001  

Vite proxy forwards `/api` to the API in development when `VITE_API_URL` is not set.

### Seed (first-run roles and admin user)

Roles and the Super Admin user are seeded on API startup when `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set. To seed without starting the server:

```bash
cd apps/api && npm run build && npm run seed
```

## Scripts

- `npm run build` – build shared, API, and web
- `npm run dev:api` – run API in watch mode
- `npm run dev:web` – run web dev server
- `npm run seed` – run DB seed (from repo root: `npm run seed -w apps/api` after building API)

## Production (Railway)

See [docs/railway.md](docs/railway.md) for step-by-step Railway setup, services, and env vars.

## Documentation

- [docs/railway.md](docs/railway.md) – Railway production setup
- [docs/rbac.md](docs/rbac.md) – Roles and permissions
- [docs/import-template.md](docs/import-template.md) – Import template and validations
- [docs/coordinates.md](docs/coordinates.md) – NAD83/WGS84 and extension plan

## License

Proprietary.
