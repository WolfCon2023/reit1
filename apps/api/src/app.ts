import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import sitesRoutes from "./routes/sites.js";
import geoRoutes from "./routes/geo.js";
import importRoutes from "./routes/import.js";
import adminRoutes from "./routes/admin/index.js";
import healthRoutes from "./routes/health.js";
import projectsRoutes from "./routes/projects.js";
import projectSitesRoutes from "./routes/projectSites.js";
import projectImportRoutes from "./routes/projectImport.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: config.corsOrigin,
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
app.use("/api/projects", projectsRoutes);
app.use("/api/projects/:projectId/sites", projectSitesRoutes);
app.use("/api/projects/:projectId/import", projectImportRoutes);
app.use("/api/admin", adminRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message === "Only .xlsx files are allowed") {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
