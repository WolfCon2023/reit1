# Railway production setup

## Overview

- **reit-web** – Frontend (Vite build, served by `node server.js` on `$PORT`)
- **reit-api** – Backend (Node, listen on `0.0.0.0` and `process.env.PORT`)
- **reit-mongodb** – Railway MongoDB plugin
- **Volume** – Mounted at `/data/backups` on the API service for mongodump backups

## 1. Create project and MongoDB

1. New Railway project.
2. Add **MongoDB** plugin (e.g. “MongoDB” from Railway).
3. Note the `MONGODB_URI` variable (or `MONGO_URL`) and attach it to the API service.

## 2. API service (reit-api)

1. New service from **GitHub repo**.
2. **Root directory:** leave as default (repo root `/`). The monorepo root `package.json` defines workspaces — Railway must install from root so `@reit1/shared` is linked.
3. **Build command** (use the root script that chains shared → api):
   ```bash
   npm run build:api
   ```
   This runs `npm run build -w packages/shared && npm run build -w apps/api`, ensuring the shared package is compiled before the API.
   
   > **Why not `npm run build --workspace=reit-api`?** That only runs `tsc` inside `apps/api`. Since `@reit1/shared` must be compiled first (its `dist/` must exist), you need the root `build:api` script which chains the builds in order.
4. **Start command:**
   ```bash
   npm run start -w apps/api
   ```
5. **Watch Paths:** Add both so shared changes trigger a rebuild:
   - `/apps/api/**`
   - `/packages/shared/**`
5. **Environment variables:**
   - `NODE_ENV=production`
   - `MONGODB_URI` – from MongoDB plugin (reference the plugin variable).
   - `JWT_SECRET` – long random string (e.g. 32+ chars).
   - `CORS_ORIGIN` – full URL **with `https://`** of the web frontend (e.g. `https://reit-web-production.up.railway.app`).
   - `UPLOAD_MAX_MB=10`
   - `BACKUP_DIR=/data/backups`
   - `BACKUP_RETENTION_DAYS=30`
   - `ENABLE_BACKUP_SCHEDULER=false` (or `true` to use internal scheduler).
   - `BACKUP_SCHEDULE_HOUR_UTC=2`, `BACKUP_SCHEDULE_MINUTE_UTC=0` (if scheduler enabled).
   - `SEED_ADMIN_EMAIL` – admin email (required for first run).
   - `SEED_ADMIN_PASSWORD` – admin password (required).
   - `SEED_ADMIN_NAME` – optional display name.
6. **Volume:** Create a volume and mount at **Mount path** ` /data/backups` for the API service.

## 3. Web service (reit-web)

1. New service from same repo.
2. **Root directory:** leave as default (repo root `/`).
3. **Build command** (use the root script that chains shared → web):
   ```bash
   npm run build:web
   ```
4. **Start command:**
   ```bash
   npm run start -w apps/web
   ```
5. **Watch Paths:** Add both so shared changes trigger a rebuild:
   - `/apps/web/**`
   - `/packages/shared/**`
6. **Environment variables:**
   - `VITE_API_URL` – full URL **with `https://`** of the API (e.g. `https://reit-api-production.up.railway.app`). This is baked into the frontend at build time.

## 4. Domains

- Use Railway-generated domains for web and API.
- Set API’s `CORS_ORIGIN` to the web domain and, if needed, custom domain.

## 5. Backups

- **Manual:** Admin with `backups:manage` can call `POST /api/admin/backup/run`.
- **Scheduled:** Set `ENABLE_BACKUP_SCHEDULER=true` and optionally `BACKUP_SCHEDULE_*`. Or use a Railway cron job that runs `scripts/mongo-backup.sh` (with `MONGODB_URI`, `BACKUP_DIR` set) and then prune.
- Backups are written to the volume at `/data/backups`; prune keeps last 30 days (configurable via `BACKUP_RETENTION_DAYS`).

## 6. First deploy

1. Deploy API first so MongoDB is connected and seed runs (with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`).
2. Log in at the web app with the seed admin credentials.
3. Create more users/roles via Admin → Users and Roles.
