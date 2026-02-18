import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { fileURLToPath } from "node:url";
import { Role, User } from "../models/index.js";
import { config } from "../config.js";
import { ROLE_NAMES, ROLE_PERMISSIONS } from "@reit1/shared";
import { migrateProjects } from "./migrateProjects.js";

async function deduplicateRoles(): Promise<void> {
  const pipeline = [
    { $group: { _id: "$name", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ];
  const dupes = await Role.aggregate(pipeline);
  for (const d of dupes) {
    const [keepId, ...removeIds] = d.ids as mongoose.Types.ObjectId[];
    // Reassign users from duplicate roles to the kept one
    await User.updateMany(
      { roles: { $in: removeIds } },
      { $addToSet: { roles: keepId }, $pullAll: { roles: removeIds } }
    );
    await Role.deleteMany({ _id: { $in: removeIds } });
    console.log(`Seed: Merged ${removeIds.length} duplicate "${d._id}" role(s) and reassigned users.`);
  }
}

export async function seed(): Promise<void> {
  await deduplicateRoles();

  const count = await Role.countDocuments();
  if (count > 0) {
    // Sync ALL role documents matching each system role name with the
    // latest permission definitions. This handles roles that lost isSystem
    // or were recreated through the admin UI.
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
      const matchingRoles = await Role.find({ name: roleName });
      for (const role of matchingRoles) {
        const current = new Set(role.permissions);
        const desired = new Set(perms);
        const missing = perms.filter((p) => !current.has(p));
        const needsSystemFlag = !role.isSystem;
        if (missing.length > 0 || needsSystemFlag) {
          role.permissions = [...desired];
          role.isSystem = true;
          await role.save();
          console.log(`Seed: Synced "${roleName}" — ${missing.length} new permissions${needsSystemFlag ? ", restored isSystem flag" : ""}`);
        }
      }
    }
  } else {
    await Role.create([
      { name: ROLE_NAMES.SUPER_ADMIN, description: "Full access", permissions: ROLE_PERMISSIONS[ROLE_NAMES.SUPER_ADMIN], isSystem: true },
      { name: ROLE_NAMES.ADMIN, description: "Admin access", permissions: ROLE_PERMISSIONS[ROLE_NAMES.ADMIN], isSystem: true },
      { name: ROLE_NAMES.DATA_MANAGER, description: "Sites and import", permissions: ROLE_PERMISSIONS[ROLE_NAMES.DATA_MANAGER], isSystem: true },
      { name: ROLE_NAMES.VIEWER, description: "Read only", permissions: ROLE_PERMISSIONS[ROLE_NAMES.VIEWER], isSystem: true },
    ]);
    console.log("Seeded roles.");
  }

  await migrateProjects();

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
