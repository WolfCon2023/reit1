import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import sitesRoutes from "./routes/sites.js";
import geoRoutes from "./routes/geo.js";
import importRoutes from "./routes/import.js";
import adminRoutes from "./routes/admin/index.js";
import healthRoutes from "./routes/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: config.corsOrigin || true,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests" },
});
app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/geo", geoRoutes);
app.use("/api/sites", sitesRoutes);
app.use("/api/import", importRoutes);
app.use("/api/admin", adminRoutes);

// --- Serve the web frontend from the API ---
// Look for the web dist in several possible locations
const possibleDistPaths = [
  path.resolve(__dirname, "../../web/dist"),           // dev: apps/api/src -> apps/web/dist
  path.resolve(__dirname, "../../../apps/web/dist"),    // built: apps/api/dist -> apps/web/dist
  path.resolve(process.cwd(), "apps/web/dist"),         // cwd-relative
];

let webDistPath: string | null = null;
for (const p of possibleDistPaths) {
  if (fs.existsSync(path.join(p, "index.html"))) {
    webDistPath = p;
    break;
  }
}

if (webDistPath) {
  console.log(`Serving web frontend from: ${webDistPath}`);
  app.use(express.static(webDistPath, { maxAge: "1h" }));

  // SPA fallback: any non-API route serves index.html
  app.get("*", (_req, res, next) => {
    if (_req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDistPath!, "index.html"));
  });
} else {
  console.warn("Web dist not found. Checked:", possibleDistPaths);
  console.warn("Frontend will not be served from this API instance.");
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message === "Only .xlsx files are allowed") {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
