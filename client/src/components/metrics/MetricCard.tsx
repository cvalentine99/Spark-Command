/**
 * Reusable Metric Card Component
 * Displays a single metric with optional progress bar and trend indicator
 */

import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  progress?: number;
  progressColor?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  isLoading?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  progress,
  progressColor,
  trend,
  trendValue,
  isLoading = false,
  className,
  size = "md",
}: MetricCardProps) {
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const valueSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <GlassCard className={cn(sizeClasses[size], className)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex items-baseline gap-1">
        <span className={cn("font-display font-bold", valueSizeClasses[size])}>
          {isLoading ? "—" : value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>

      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}

      {progress !== undefined && (
        <div className="mt-3">
          <Progress 
            value={progress} 
            className={cn("h-1.5", progressColor)} 
          />
        </div>
      )}

      {trend && trendValue && (
        <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendValue}</span>
        </div>
      )}
    </GlassCard>
  );
}

/**
 * Metric Card Grid Container
 * Responsive grid layout for metric cards
 */
export function MetricCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const columnClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {children}
    </div>
  );
}

export default MetricCard;
