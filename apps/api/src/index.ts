import mongoose from "mongoose";
import { config } from "./config.js";
import app from "./app.js";
import { seed } from "./scripts/seed.js";
import { startBackupScheduler } from "./services/backupScheduler.js";
import { verifySmtp } from "./services/email.js";
import { startNotificationScheduler } from "./services/notificationScheduler.js";

async function main() {
  await mongoose.connect(config.mongoUri);
  await seed();
  startBackupScheduler();
  startNotificationScheduler();
  verifySmtp();
  const port = config.port;
  app.listen(port, "0.0.0.0", () => {
    console.log(`API listening on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
