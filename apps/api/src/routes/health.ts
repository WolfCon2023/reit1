import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    database: dbOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
