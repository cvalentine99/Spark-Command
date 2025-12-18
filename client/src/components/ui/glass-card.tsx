import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "active" | "alert";
  noPadding?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  variant = "default", 
  noPadding = false,
  ...props 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-card backdrop-blur-xl transition-all duration-300",
        "hover:border-white/20 hover:shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)]",
        variant === "active" && "border-primary/50 shadow-[0_0_20px_-5px_var(--primary)]",
        variant === "alert" && "border-destructive/50 shadow-[0_0_20px_-5px_var(--destructive)]",
        !noPadding && "p-6",
        className
      )}
      {...props}
    >
      {/* Noise texture overlay for that "premium" feel */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />
      
      {/* Gradient glow effect */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
