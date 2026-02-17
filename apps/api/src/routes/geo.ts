import { Router } from "express";
import { ZipCache } from "../models/index.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { PERMISSIONS } from "@reit1/shared";

const router = Router();

router.get("/zip/:zip", requireAuth, requirePermission(PERMISSIONS.SITES_READ), async (req, res) => {
  const zip = String(req.params.zip).replace(/\D/g, "").slice(0, 5);
  if (!zip || zip.length < 5) {
    res.status(400).json({ error: "Invalid ZIP code" });
    return;
  }
  const cached = await ZipCache.findOne({ zip });
  if (cached) {
    return res.json({ zip: cached.zip, city: cached.city, state: cached.state, county: cached.county });
  }
  // Optional: call external API (e.g. nominatim, ziptastic) and cache result.
  // For now return empty so UI can still allow manual entry.
  return res.json({ zip, city: undefined, state: undefined, county: undefined });
});

export default router;
