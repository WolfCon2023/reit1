import crypto from "node:crypto";
import { generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import { User } from "../models/index.js";

const APP_NAME = "REIT Site Administration";

const totpConfig = {
  digits: 6,
  period: 30,
  algorithm: "sha1" as const,
};

export function createSecret(): string {
  return otpGenerateSecret();
}

export async function generateQRCode(email: string, secret: string): Promise<string> {
  const otpauthUrl = generateURI({
    strategy: "totp",
    secret,
    issuer: APP_NAME,
    label: email,
    algorithm: totpConfig.algorithm,
    digits: totpConfig.digits,
    period: totpConfig.period,
  });
  return QRCode.toDataURL(otpauthUrl);
}

export function formatSecretForManualEntry(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

export function verifyToken(secret: string, token: string): boolean {
  const result = verifySync({
    secret,
    token,
    digits: totpConfig.digits,
    period: totpConfig.period,
    algorithm: totpConfig.algorithm,
  });
  // verifySync returns { valid, delta } in otplib v13+
  if (typeof result === "boolean") return result;
  return (result as { valid: boolean }).valid;
}

export async function initiateMfaSetup(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const secret = createSecret();
  const qrCodeUrl = await generateQRCode(user.email, secret);
  const manualEntryKey = formatSecretForManualEntry(secret);
  const backupCodes = generateBackupCodes();

  user.mfaSecret = secret;
  user.mfaEnabled = false;
  await user.save();

  return { qrCodeUrl, manualEntryKey, backupCodes };
}

export async function completeMfaSetup(userId: string, token: string) {
  const user = await User.findById(userId).select("+mfaSecret");
  if (!user || !user.mfaSecret) {
    return { success: false, message: "MFA setup not initiated" };
  }

  if (!verifyToken(user.mfaSecret, token)) {
    return { success: false, message: "Invalid verification code" };
  }

  user.mfaEnabled = true;
  await user.save();
  return { success: true, message: "MFA enabled successfully" };
}

export async function verifyMfaLogin(userId: string, token: string) {
  const user = await User.findById(userId).select("+mfaSecret");
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return { success: false, message: "MFA is not enabled for this account" };
  }

  if (!verifyToken(user.mfaSecret, token)) {
    return { success: false, message: "Invalid verification code" };
  }

  return { success: true, message: "MFA verification successful" };
}

export async function disableMfa(userId: string, password: string) {
  const user = await User.findById(userId).select("+mfaSecret passwordHash");
  if (!user) {
    return { success: false, message: "User not found" };
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { success: false, message: "Invalid password" };
  }

  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  await user.save();
  return { success: true, message: "MFA disabled successfully" };
}

export async function getMfaStatus(userId: string) {
  const user = await User.findById(userId).select("mfaEnabled mfaEnforced");
  if (!user) throw new Error("User not found");
  return { enabled: !!user.mfaEnabled, enforced: !!user.mfaEnforced };
}
