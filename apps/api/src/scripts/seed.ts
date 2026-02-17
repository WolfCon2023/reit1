import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";
import { Role, User } from "../models/index.js";
import { config } from "../config.js";
import { ROLE_NAMES, ROLE_PERMISSIONS } from "@reit1/shared";

export async function seed(): Promise<void> {
  const count = await Role.countDocuments();
  if (count > 0) {
    console.log("Roles already exist, skipping role seed.");
  } else {
    await Role.create([
      { name: ROLE_NAMES.SUPER_ADMIN, description: "Full access", permissions: ROLE_PERMISSIONS[ROLE_NAMES.SUPER_ADMIN], isSystem: true },
      { name: ROLE_NAMES.ADMIN, description: "Admin access", permissions: ROLE_PERMISSIONS[ROLE_NAMES.ADMIN], isSystem: true },
      { name: ROLE_NAMES.DATA_MANAGER, description: "Sites and import", permissions: ROLE_PERMISSIONS[ROLE_NAMES.DATA_MANAGER], isSystem: true },
      { name: ROLE_NAMES.VIEWER, description: "Read only", permissions: ROLE_PERMISSIONS[ROLE_NAMES.VIEWER], isSystem: true },
    ]);
    console.log("Seeded roles.");
  }

  const adminEmail = config.seedAdminEmail;
  const adminPassword = config.seedAdminPassword;
  if (!adminEmail || !adminPassword) {
    const oneTime = Math.random().toString(36).slice(2, 14);
    console.warn("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required. Set them in .env.");
    console.warn("One-time random password for manual creation:", oneTime);
    return;
  }

  const superAdminRole = await Role.findOne({ name: ROLE_NAMES.SUPER_ADMIN });
  if (!superAdminRole) throw new Error("Super Admin role not found");

  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) {
    console.log("Seed admin user already exists.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await User.create({
    email: adminEmail.toLowerCase(),
    name: config.seedAdminName ?? "Super Admin",
    passwordHash,
    roles: [superAdminRole._id],
    isActive: true,
  });
  console.log("Seeded Super Admin user:", adminEmail);
}

/* Only run standalone when executed directly (e.g. `node dist/scripts/seed.js`) */
const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    process.argv[1].replace(/\\/g, "/");

if (isMainModule) {
  (async () => {
    await mongoose.connect(config.mongoUri);
    await seed();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
