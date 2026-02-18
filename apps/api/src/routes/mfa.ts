import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { mfaVerifySetupSchema, mfaDisableSchema } from "@reit1/shared";
import * as mfaService from "../services/mfa.js";

const router = Router();

router.get("/status", requireAuth, async (req, res) => {
  const status = await mfaService.getMfaStatus(req.user!.userId);
  res.json({ success: true, data: status });
});

router.post("/setup", requireAuth, async (req, res) => {
  try {
    const data = await mfaService.initiateMfaSetup(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: (err as Error).message } });
  }
});

router.post("/verify-setup", requireAuth, async (req, res) => {
  const parsed = mfaVerifySetupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: "Invalid input", details: parsed.error.flatten() } });
    return;
  }
  const result = await mfaService.completeMfaSetup(req.user!.userId, parsed.data.token);
  if (!result.success) {
    res.status(400).json({ success: false, error: { message: result.message } });
    return;
  }
  res.json({ success: true, message: result.message });
});

router.post("/disable", requireAuth, async (req, res) => {
  const parsed = mfaDisableSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { message: "Invalid input", details: parsed.error.flatten() } });
    return;
  }
  const result = await mfaService.disableMfa(req.user!.userId, parsed.data.password);
  if (!result.success) {
    res.status(400).json({ success: false, error: { message: result.message } });
    return;
  }
  res.json({ success: true, message: result.message });
});

export default router;
