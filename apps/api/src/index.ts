import mongoose from "mongoose";
import { config } from "./config.js";
import app from "./app.js";
import { seed } from "./scripts/seed.js";
import { startBackupScheduler } from "./services/backupScheduler.js";

async function main() {
  await mongoose.connect(config.mongoUri);
  await seed();
  startBackupScheduler();
  const port = config.port;
  app.listen(port, "0.0.0.0", () => {
    console.log(`API listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
