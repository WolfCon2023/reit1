import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { MfaSetup } from "@/components/MfaSetup";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { UserCircle, Key } from "lucide-react";

interface ProfileData {
  _id: string;
  email: string;
  name: string;
  lastLoginAt?: string;
  createdAt: string;
}

function MfaSection() {
  const { data, refetch } = useQuery({
    queryKey: ["mfa-status"],
    queryFn: () => api<{ success: boolean; data: { enabled: boolean; enforced: boolean } }>("/api/mfa/status"),
  });
  const status = data?.data;
  if (!status) return null;
  return (
    <MfaSetup
      mfaEnabled={status.enabled}
      mfaEnforced={status.enforced}
      onStatusChange={() => refetch()}
    />
  );
}

export function Profile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const p = await api<ProfileData>("/api/profile");
      setName(p.name);
      return p;
    },
  });

  const updateNameMut = useMutation({
    mutationFn: () => api("/api/profile", { method: "PUT", body: { name } }),
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setProfileMsg("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (user) {
        setUser({ ...user, name });
      }
      setTimeout(() => setProfileMsg(""), 3000);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changePasswordMut = useMutation({
    mutationFn: () =>
      api("/api/profile/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      }),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPasswordMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setTimeout(() => setPasswordMsg(""), 3000);
    },
    onError: (err: Error) => { setPasswordError(err.message); toast.error(err.message); },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    changePasswordMut.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input value={profile?.email ?? ""} disabled className="mt-1 bg-muted" />
          </div>
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Last Login</span>
              <p className="font-medium">{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Account Created</span>
              <p className="font-medium">{profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : "—"}</p>
            </div>
          </div>
          {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
          <Button onClick={() => updateNameMut.mutate()} disabled={updateNameMut.isPending}>
            {updateNameMut.isPending ? "Saving..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1" />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
            <Button type="submit" disabled={changePasswordMut.isPending}>
              {changePasswordMut.isPending ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <MfaSection />
    </div>
  );
}
