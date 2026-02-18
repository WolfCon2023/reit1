import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldOff,
  QrCode,
  Copy,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

interface MfaSetupProps {
  mfaEnabled: boolean;
  mfaEnforced?: boolean;
  onStatusChange: () => void;
}

type MfaStep = "initial" | "setup" | "backup" | "disable";

interface SetupData {
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export function MfaSetup({ mfaEnabled, mfaEnforced, onStatusChange }: MfaSetupProps) {
  const [step, setStep] = useState<MfaStep>("initial");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartSetup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api<{ success: boolean; data: SetupData }>("/api/mfa/setup", {
        method: "POST",
      });
      setSetupData(res.data);
      setVerificationCode("");
      setStep("setup");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start MFA setup");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    setError("");
    setLoading(true);
    try {
      await api("/api/mfa/verify-setup", {
        method: "POST",
        body: { token: verificationCode },
      });
      toast.success("Two-factor authentication enabled!");
      setStep("backup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setError("");
    setLoading(true);
    try {
      await api("/api/mfa/disable", {
        method: "POST",
        body: { password: disablePassword },
      });
      toast.success("Two-factor authentication disabled.");
      setDisablePassword("");
      setStep("initial");
      onStatusChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable MFA");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied to clipboard`),
      () => toast.error("Failed to copy")
    );
  };

  const finishSetup = () => {
    setSetupData(null);
    setVerificationCode("");
    setStep("initial");
    onStatusChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Initial ── */}
        {step === "initial" && (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${mfaEnabled ? "bg-green-500/10" : "bg-muted"}`}>
                  {mfaEnabled ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <ShieldOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Status</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={mfaEnabled ? "success" : "secondary"}>
                      {mfaEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {mfaEnforced && !mfaEnabled && (
                      <Badge variant="warning">Required</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {mfaEnforced && !mfaEnabled && (
              <div className="flex items-start gap-2 rounded-lg bg-warning/10 text-warning p-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Your administrator requires two-factor authentication. Please set it up to continue using your account.</p>
              </div>
            )}

            {!mfaEnabled ? (
              <Button onClick={handleStartSetup} disabled={loading} className="gap-2">
                <QrCode className="h-4 w-4" />
                {loading ? "Setting up..." : "Set Up Two-Factor Authentication"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => { setStep("disable"); setError(""); setDisablePassword(""); }}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <ShieldOff className="h-4 w-4" />
                Disable Two-Factor Authentication
              </Button>
            )}
          </>
        )}

        {/* ── Setup ── */}
        {step === "setup" && setupData && (
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Step 1: Scan the QR code</p>
              <p>Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code.</p>
            </div>

            <div className="flex justify-center">
              <div className="rounded-xl border bg-white p-3">
                <img src={setupData.qrCodeUrl} alt="MFA QR Code" className="h-48 w-48" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Can't scan? Enter this key manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono tracking-wider">
                  {setupData.manualEntryKey}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setupData.manualEntryKey.replace(/ /g, ""), "Secret key")}
                  className="shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Step 2: Enter the verification code</p>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                className="h-12 text-center text-2xl tracking-[0.3em] font-mono max-w-xs"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleVerifySetup}
                disabled={loading || verificationCode.length !== 6}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? "Verifying..." : "Verify and Enable"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setStep("initial"); setSetupData(null); setError(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Backup Codes ── */}
        {step === "backup" && setupData && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg bg-green-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">
                  Two-Factor Authentication Enabled
                </p>
                <p className="text-sm text-green-700 dark:text-green-500 mt-1">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code, i) => (
                  <code key={i} className="text-sm font-mono text-center py-1.5 rounded bg-background border">
                    {code}
                  </code>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => copyToClipboard(setupData.backupCodes.join("\n"), "Backup codes")}
                className="gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy backup codes
              </Button>
              <Button onClick={finishSetup} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                I've saved my backup codes
              </Button>
            </div>
          </div>
        )}

        {/* ── Disable ── */}
        {step === "disable" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Disabling two-factor authentication will reduce the security of your account. You will no longer be asked for a verification code when logging in.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disable-password">Confirm your password</Label>
              <Input
                id="disable-password"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                autoComplete="current-password"
                className="h-11"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={loading || !disablePassword}
                className="gap-2"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? "Disabling..." : "Disable Two-Factor Authentication"}
              </Button>
              <Button variant="outline" onClick={() => { setStep("initial"); setError(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
