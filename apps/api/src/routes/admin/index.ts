import { Router } from "express";
import users from "./users.js";
import roles from "./roles.js";
import audit from "./audit.js";
import backup from "./backup.js";
import settings from "./settings.js";

const router = Router();
router.use("/users", users);
router.use("/roles", roles);
router.use("/audit", audit);
router.use("/backup", backup);
router.use("/settings", settings);

export default router;
