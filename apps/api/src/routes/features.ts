import { Router } from "express";
import { getAllFlags } from "../lib/featureFlags.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getAllFlags());
});

export default router;
