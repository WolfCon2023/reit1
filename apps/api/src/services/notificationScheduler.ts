import { Lease } from "../models/Lease.js";
import { Document } from "../models/Document.js";
import { User } from "../models/index.js";
import { sendEmail } from "./email.js";
import { config } from "../config.js";

async function getAdminEmails(): Promise<string[]> {
  const admins = await User.find({ isActive: true })
    .populate("roles", "permissions")
    .lean();
  return admins
    .filter((u) => {
      const roles = u.roles as unknown as { permissions: string[] }[];
      return roles?.some((r) => r.permissions?.includes("leases:read"));
    })
    .map((u) => u.email);
}

async function checkLeaseExpirations(): Promise<void> {
  const now = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);

  const expiringLeases = await Lease.find({
    isDeleted: { $ne: true },
    status: "active",
    leaseEndDate: { $gte: now, $lte: d30 },
  })
    .populate("projectId", "name")
    .sort("leaseEndDate")
    .limit(100)
    .lean();

  if (expiringLeases.length === 0) return;

  const emails = await getAdminEmails();
  if (emails.length === 0) return;

  const rows = expiringLeases.map((l) => {
    const proj = l.projectId as unknown as { name: string };
    const daysLeft = Math.ceil((new Date(l.leaseEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `- ${l.tenantName} (Project: ${proj?.name ?? "Unknown"}) — expires in ${daysLeft} days (${new Date(l.leaseEndDate).toLocaleDateString()}) — $${l.monthlyRent}/mo`;
  });

  const subject = `REIT Alert: ${expiringLeases.length} lease(s) expiring within 30 days`;
  const text = [
    "The following leases are expiring within the next 30 days:",
    "",
    ...rows,
    "",
    "Please review and take action as needed.",
    "",
    "— REIT Site Administration",
  ].join("\n");

  const html = `
    <h2>Lease Expiration Alert</h2>
    <p>${expiringLeases.length} lease(s) expiring within the next 30 days:</p>
    <ul>${rows.map((r) => `<li>${r.slice(2)}</li>`).join("")}</ul>
    <p>Please review and take action as needed.</p>
    <hr/><p style="color:#888;font-size:12px">REIT Site Administration</p>
  `;

  for (const email of emails) {
    await sendEmail({ to: email, subject, text, html });
  }
  console.log(`Notifications: Sent lease expiration alerts to ${emails.length} users (${expiringLeases.length} leases).`);
}

async function checkDocumentExpirations(): Promise<void> {
  const now = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);

  const expiringDocs = await Document.find({
    isDeleted: { $ne: true },
    expiresAt: { $gte: now, $lte: d30 },
  })
    .populate("projectId", "name")
    .sort("expiresAt")
    .limit(100)
    .lean();

  if (expiringDocs.length === 0) return;

  const emails = await getAdminEmails();
  if (emails.length === 0) return;

  const rows = expiringDocs.map((d) => {
    const proj = d.projectId as unknown as { name: string };
    const daysLeft = Math.ceil((new Date(d.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `- ${d.title} [${d.category}] (Project: ${proj?.name ?? "Unknown"}) — expires in ${daysLeft} days (${new Date(d.expiresAt!).toLocaleDateString()})`;
  });

  const subject = `REIT Alert: ${expiringDocs.length} document(s) expiring within 30 days`;
  const text = [
    "The following documents are expiring within the next 30 days:",
    "",
    ...rows,
    "",
    "Please review and renew as needed.",
    "",
    "— REIT Site Administration",
  ].join("\n");

  const html = `
    <h2>Document Expiration Alert</h2>
    <p>${expiringDocs.length} document(s) expiring within the next 30 days:</p>
    <ul>${rows.map((r) => `<li>${r.slice(2)}</li>`).join("")}</ul>
    <p>Please review and renew as needed.</p>
    <hr/><p style="color:#888;font-size:12px">REIT Site Administration</p>
  `;

  for (const email of emails) {
    await sendEmail({ to: email, subject, text, html });
  }
  console.log(`Notifications: Sent document expiration alerts to ${emails.length} users (${expiringDocs.length} docs).`);
}

async function runNotificationChecks(): Promise<void> {
  try {
    await checkLeaseExpirations();
  } catch (err) {
    console.error("Notification check (leases) failed:", err);
  }
  try {
    await checkDocumentExpirations();
  } catch (err) {
    console.error("Notification check (documents) failed:", err);
  }
}

export function startNotificationScheduler(): void {
  if (process.env.ENABLE_NOTIFICATIONS === "false") return;
  if (!config.smtp.host) {
    console.log("Notification scheduler skipped (SMTP not configured).");
    return;
  }

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(8, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const ms = next.getTime() - now.getTime();
    setTimeout(async () => {
      await runNotificationChecks();
      scheduleNext();
    }, ms);
  };

  scheduleNext();
  console.log("Notification scheduler enabled (daily at 08:00 UTC).");
}
