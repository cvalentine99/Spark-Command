/**
 * Status Badge Component
 * Displays system status with appropriate colors and animations
 */

import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, AlertTriangle, XCircle, Circle } from "lucide-react";

export type StatusType = "online" | "offline" | "warning" | "loading" | "operational" | "degraded" | "healthy" | "unhealthy";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusConfig: Record<StatusType, {
  bgColor: string;
  textColor: string;
  dotColor: string;
  icon: typeof CheckCircle;
  defaultLabel: string;
}> = {
  online: {
    bgColor: "bg-green-500/10 border-green-500/20",
    textColor: "text-green-400",
    dotColor: "bg-green-500",
    icon: CheckCircle,
    defaultLabel: "Online",
  },
  operational: {
    bgColor: "bg-green-500/10 border-green-500/20",
    textColor: "text-green-400",
    dotColor: "bg-green-500",
    icon: CheckCircle,
    defaultLabel: "Operational",
  },
  healthy: {
    bgColor: "bg-green-500/10 border-green-500/20",
    textColor: "text-green-400",
    dotColor: "bg-green-500",
    icon: CheckCircle,
    defaultLabel: "Healthy",
  },
  offline: {
    bgColor: "bg-red-500/10 border-red-500/20",
    textColor: "text-red-400",
    dotColor: "bg-red-500",
    icon: XCircle,
    defaultLabel: "Offline",
  },
  unhealthy: {
    bgColor: "bg-red-500/10 border-red-500/20",
    textColor: "text-red-400",
    dotColor: "bg-red-500",
    icon: XCircle,
    defaultLabel: "Unhealthy",
  },
  warning: {
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    textColor: "text-yellow-400",
    dotColor: "bg-yellow-500",
    icon: AlertTriangle,
    defaultLabel: "Warning",
  },
  degraded: {
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    textColor: "text-yellow-400",
    dotColor: "bg-yellow-500",
    icon: AlertTriangle,
    defaultLabel: "Degraded",
  },
  loading: {
    bgColor: "bg-white/10 border-white/20",
    textColor: "text-muted-foreground",
    dotColor: "bg-muted-foreground",
    icon: Circle,
    defaultLabel: "Loading",
  },
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.defaultLabel;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const dotSizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border",
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {status === "loading" ? (
        <Loader2 className={cn("animate-spin", dotSizeClasses[size])} />
      ) : showDot ? (
        <div
          className={cn(
            "rounded-full animate-pulse",
            config.dotColor,
            dotSizeClasses[size]
          )}
        />
      ) : null}
      <span>{displayLabel}</span>
    </div>
  );
}

/**
 * Inline Status Indicator
 * Smaller inline status indicator for tables and lists
 */
export function StatusIndicator({
  status,
  className,
}: {
  status: StatusType;
  className?: string;
}) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full",
        status === "loading" ? "animate-pulse" : "animate-pulse",
        config.dotColor,
        className
      )}
    />
  );
}

export default StatusBadge;
