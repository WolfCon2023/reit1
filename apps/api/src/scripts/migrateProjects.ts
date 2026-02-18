import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import { Project, Site, ImportBatch } from "../models/index.js";
import { config } from "../config.js";

const DEFAULT_PROJECT_NAME = "Default Project";

export async function migrateProjects(): Promise<void> {
  // Drop the old single-field unique index on siteId if it exists.
  // It's been replaced by the compound index { projectId, siteId }.
  try {
    const siteIndexes = await Site.collection.indexes();
    const legacyIdx = siteIndexes.find(
      (idx: { key: Record<string, unknown>; unique?: boolean }) =>
        idx.unique && idx.key.siteId && !idx.key.projectId && Object.keys(idx.key).length === 1
    );
    if (legacyIdx) {
      await Site.collection.dropIndex(legacyIdx.name!);
      console.log(`Migration: Dropped legacy unique index "${legacyIdx.name}" on sites.siteId.`);
    }
  } catch (err) {
    console.warn("Migration: Could not check/drop legacy siteId index:", (err as Error).message);
  }

  const sitesWithout = await Site.countDocuments({ projectId: { $exists: false } });
  const batchesWithout = await ImportBatch.countDocuments({ projectId: { $exists: false } });

  if (sitesWithout === 0 && batchesWithout === 0) {
    console.log("Migration: All records already have projectId, skipping.");
    return;
  }

  let defaultProject = await Project.findOne({ name: DEFAULT_PROJECT_NAME });
  if (!defaultProject) {
    defaultProject = await Project.create({
      name: DEFAULT_PROJECT_NAME,
      description: "Auto-created during migration for existing unscoped records.",
    });
    console.log(`Migration: Created "${DEFAULT_PROJECT_NAME}" (${defaultProject._id}).`);
  }

  if (sitesWithout > 0) {
    const result = await Site.updateMany(
      { projectId: { $exists: false } },
      { $set: { projectId: defaultProject._id } }
    );
    console.log(`Migration: Assigned ${result.modifiedCount} sites to "${DEFAULT_PROJECT_NAME}".`);
  }

  if (batchesWithout > 0) {
    const result = await ImportBatch.updateMany(
      { projectId: { $exists: false } },
      { $set: { projectId: defaultProject._id } }
    );
    console.log(`Migration: Assigned ${result.modifiedCount} import batches to "${DEFAULT_PROJECT_NAME}".`);
  }

  console.log("Migration: Complete.");
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    process.argv[1].replace(/\\/g, "/");

if (isMainModule) {
  (async () => {
    await mongoose.connect(config.mongoUri);
    await migrateProjects();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
