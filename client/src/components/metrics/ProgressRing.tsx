/**
 * Progress Ring Component
 * Circular progress indicator with customizable colors and sizes
 */

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  trackColor?: string;
  progressColor?: string;
  showValue?: boolean;
  valueLabel?: string;
  valueUnit?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  className,
  trackColor = "stroke-white/10",
  progressColor,
  showValue = true,
  valueLabel,
  valueUnit = "%",
  children,
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Auto-determine color based on percentage if not provided
  const getAutoColor = () => {
    if (percentage >= 90) return "stroke-red-500";
    if (percentage >= 75) return "stroke-yellow-500";
    if (percentage >= 50) return "stroke-blue-500";
    return "stroke-green-500";
  };

  const strokeColor = progressColor || getAutoColor();

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-500 ease-out", strokeColor)}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ? (
          children
        ) : showValue ? (
          <>
            <span className="text-2xl font-bold font-display">
              {Math.round(percentage)}
              <span className="text-sm text-muted-foreground">{valueUnit}</span>
            </span>
            {valueLabel && (
              <span className="text-xs text-muted-foreground">{valueLabel}</span>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Mini Progress Ring
 * Smaller version for inline use
 */
export function MiniProgressRing({
  value,
  max = 100,
  size = 32,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}) {
  return (
    <ProgressRing
      value={value}
      max={max}
      size={size}
      strokeWidth={3}
      showValue={false}
      className={className}
    />
  );
}

/**
 * Temperature Ring
 * Specialized ring for temperature display
 */
export function TemperatureRing({
  temperature,
  maxTemp = 100,
  size = 80,
  className,
}: {
  temperature: number;
  maxTemp?: number;
  size?: number;
  className?: string;
}) {
  const getColor = () => {
    if (temperature >= 85) return "stroke-red-500";
    if (temperature >= 75) return "stroke-orange-500";
    if (temperature >= 65) return "stroke-yellow-500";
    return "stroke-green-500";
  };

  return (
    <ProgressRing
      value={temperature}
      max={maxTemp}
      size={size}
      strokeWidth={6}
      progressColor={getColor()}
      valueUnit="°C"
      className={className}
    />
  );
}

/**
 * Usage Ring
 * Specialized ring for utilization/usage display
 */
export function UsageRing({
  usage,
  label,
  size = 100,
  className,
}: {
  usage: number;
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <ProgressRing
      value={usage}
      max={100}
      size={size}
      strokeWidth={8}
      valueLabel={label}
      className={className}
    />
  );
}

export default ProgressRing;
