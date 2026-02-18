import { create } from "zustand";
import { api } from "@/lib/api";

interface FeaturesState {
  flags: Record<string, boolean>;
  loaded: boolean;
  loadFlags: () => Promise<void>;
  isEnabled: (name: string) => boolean;
}

export const useFeaturesStore = create<FeaturesState>()((set, get) => ({
  flags: {},
  loaded: false,
  loadFlags: async () => {
    try {
      const flags = await api<Record<string, boolean>>("/api/features");
      set({ flags, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  isEnabled: (name: string) => {
    const { flags } = get();
    return flags[name] !== false;
  },
}));
