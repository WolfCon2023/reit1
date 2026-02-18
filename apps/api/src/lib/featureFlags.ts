const FLAGS: Record<string, boolean> = {
  map: process.env.FEATURE_MAP !== "false",
  leases: process.env.FEATURE_LEASES !== "false",
  documents: process.env.FEATURE_DOCUMENTS !== "false",
  insights: process.env.FEATURE_INSIGHTS !== "false",
  views: process.env.FEATURE_VIEWS !== "false",
};

export function isFeatureEnabled(name: string): boolean {
  return FLAGS[name] ?? true;
}

export function getAllFlags(): Record<string, boolean> {
  return { ...FLAGS };
}

export function requireFeature(name: string) {
  return (_req: any, res: any, next: any) => {
    if (!isFeatureEnabled(name)) {
      res.status(404).json({ error: "Feature not available" });
      return;
    }
    next();
  };
}
