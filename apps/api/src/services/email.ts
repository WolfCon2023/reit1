import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtp.host || !config.smtp.user) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn("SMTP not configured — email not sent:", options.subject, "→", options.to);
    return false;
  }
  try {
    await t.sendMail({
      from: config.smtp.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

/** Verify SMTP connection on startup (non-blocking). */
export async function verifySmtp(): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log("SMTP not configured — email disabled.");
    return;
  }
  try {
    await t.verify();
    console.log("SMTP connection verified (%s:%d as %s)", config.smtp.host, config.smtp.port, config.smtp.user);
  } catch (err) {
    console.error("SMTP verification failed:", err);
  }
}

/** Convenience: send password-reset notification to a user. */
export async function sendPasswordResetNotification(toEmail: string, resetByAdmin: string): Promise<boolean> {
  return sendEmail({
    to: toEmail,
    subject: "REIT Admin — Your password has been reset",
    text: [
      "Your password has been reset by an administrator.",
      "",
      `Reset by: ${resetByAdmin}`,
      "",
      "If you did not expect this, please contact your administrator immediately.",
      "",
      "— REIT Site Administration",
    ].join("\n"),
    html: `
      <p>Your password has been reset by an administrator.</p>
      <p><strong>Reset by:</strong> ${resetByAdmin}</p>
      <p>If you did not expect this, please contact your administrator immediately.</p>
      <hr/>
      <p style="color:#888;font-size:12px">REIT Site Administration</p>
    `,
  });
}

/** Convenience: welcome email for newly created users. */
export async function sendWelcomeEmail(toEmail: string, name: string, tempPassword?: string): Promise<boolean> {
  const lines = [
    `Hello ${name},`,
    "",
    "Your account has been created on the REIT Site Administration system.",
    "",
    `Email: ${toEmail}`,
    ...(tempPassword ? [`Temporary password: ${tempPassword}`, "", "Please change your password after your first login."] : []),
    "",
    "— REIT Site Administration",
  ];
  return sendEmail({
    to: toEmail,
    subject: "REIT Admin — Welcome",
    text: lines.join("\n"),
    html: `
      <p>Hello ${name},</p>
      <p>Your account has been created on the REIT Site Administration system.</p>
      <p><strong>Email:</strong> ${toEmail}</p>
      ${tempPassword ? `<p><strong>Temporary password:</strong> ${tempPassword}</p><p>Please change your password after your first login.</p>` : ""}
      <hr/>
      <p style="color:#888;font-size:12px">REIT Site Administration</p>
    `,
  });
}
