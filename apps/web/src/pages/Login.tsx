import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import {
  LogIn,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  Mail,
  RefreshCw,
} from "lucide-react";

type Step = "credentials" | "otp" | "forgot" | "reset";

export function Login() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { token, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") otpInputRef.current?.focus();
  }, [step]);

  if (token) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ requiresOtp?: boolean; otpToken?: string }>(
        "/api/auth/login",
        { method: "POST", body: { email, password } }
      );
      if (res.requiresOtp && res.otpToken) {
        setOtpToken(res.otpToken);
        setOtpCode("");
        setStep("otp");
        toast.success("Verification code sent to your email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token: newToken } = await api<{
        token: string;
        user: { id: string; email: string; name: string };
      }>("/api/auth/verify-otp", { method: "POST", body: { otpToken, code: otpCode } });

      localStorage.setItem("accessToken", newToken);
      const me = await api<{
        id: string;
        email: string;
        name: string;
        permissions: string[];
        roles: { id: string; name: string }[];
      }>("/api/auth/me");
      setAuth(newToken, {
        id: me.id,
        email: me.email,
        name: me.name,
        permissions: me.permissions,
        roles: me.roles,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError("");
    try {
      const res = await api<{ requiresOtp?: boolean; otpToken?: string }>(
        "/api/auth/login",
        { method: "POST", body: { email, password } }
      );
      if (res.requiresOtp && res.otpToken) {
        setOtpToken(res.otpToken);
        setOtpCode("");
        toast.success("New verification code sent.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: { email: resetEmail },
      });
      toast.success("If an account exists, a reset code has been sent.");
      setStep("reset");
    } catch {
      toast.success("If an account exists, a reset code has been sent.");
      setStep("reset");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: { email: resetEmail, code: resetCode, newPassword },
      });
      toast.success("Password reset successfully. Please sign in.");
      setStep("credentials");
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setStep("credentials");
    setError("");
    setOtpCode("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-blue-950/50 dark:to-indigo-950/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" />

      <Card className="w-full max-w-md shadow-lg relative z-10 border-0 shadow-xl">
        {/* ── Credentials Step ── */}
        {step === "credentials" && (
          <>
            <CardHeader className="items-center text-center pb-2">
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
                <img src="/logo.png" alt="REIT Sites" className="h-24 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Sign in to REIT Site Administration
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </span>
                  )}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("forgot");
                      setError("");
                      setResetEmail(email);
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ── OTP Step ── */}
        {step === "otp" && (
          <>
            <CardHeader className="items-center text-center pb-2">
              <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
                <ShieldCheck className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Verification code</CardTitle>
              <CardDescription className="text-base">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp-code">Verification code</Label>
                  <Input
                    ref={otpInputRef}
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                    className="h-12 text-center text-2xl tracking-[0.3em] font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Verifying...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Verify
                    </span>
                  )}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                    Resend code
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ── Forgot Password Step ── */}
        {step === "forgot" && (
          <>
            <CardHeader className="items-center text-center pb-2">
              <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
                <Mail className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Forgot password</CardTitle>
              <CardDescription className="text-base">
                Enter your email and we'll send you a reset code
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleForgotPassword} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send reset code
                    </span>
                  )}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        {/* ── Reset Password Step ── */}
        {step === "reset" && (
          <>
            <CardHeader className="items-center text-center pb-2">
              <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
                <KeyRound className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
              <CardDescription className="text-base">
                Enter the code sent to{" "}
                <span className="font-medium text-foreground">{resetEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleResetPassword} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-code">Reset code</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                    className="h-12 text-center text-2xl tracking-[0.3em] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="h-11"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading || resetCode.length !== 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Resetting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Reset password
                    </span>
                  )}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={backToLogin}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
