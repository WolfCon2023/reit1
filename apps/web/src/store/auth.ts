import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  roles: { id: string; name: string }[];
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  setAuth: (token: string, user: UserInfo) => void;
  setUser: (user: UserInfo) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const TOKEN_KEY = "accessToken";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        if (typeof localStorage !== "undefined") localStorage.setItem(TOKEN_KEY, token);
        set({ token, user });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        if (typeof localStorage !== "undefined") localStorage.removeItem(TOKEN_KEY);
        set({ token: null, user: null });
      },
      hasPermission: (permission) => {
        const { user } = get();
        return !!user?.permissions?.includes(permission);
      },
    }),
    { name: "reit-auth", partialize: (s) => ({ token: s.token }) }
  )
);
