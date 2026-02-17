import { Router } from "express";
import users from "./users.js";
import roles from "./roles.js";
import audit from "./audit.js";
import backup from "./backup.js";

const router = Router();
router.use("/users", users);
router.use("/roles", roles);
router.use("/audit", audit);
router.use("/backup", backup);

export default router;
