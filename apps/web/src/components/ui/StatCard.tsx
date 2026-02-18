import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  iconColor?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, className, iconColor = "text-primary" }: StatCardProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border bg-card p-6 shadow-card hover:shadow-card-hover transition-all duration-200",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-lg bg-primary/10 p-2.5", iconColor.includes("text-") ? "" : "")}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className="absolute -bottom-2 -right-2 opacity-[0.03]">
        <Icon className="h-24 w-24" />
      </div>
    </div>
  );
}
