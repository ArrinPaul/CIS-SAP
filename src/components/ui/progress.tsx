"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/core/utils/utils"

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /**
   * "default" fills with the primary ink, so the bar follows the theme —
   * walnut on light, cream on dark. "ramp" uses the warm data gradient and
   * is for genuine data visualisation (charts, meters), not for chrome like
   * a progress or XP bar.
   */
  variant?: "default" | "ramp"
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = "default", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-notion-sunken",
      className
    )}
    {...props}
  >
    {/* Width, not translate, so a gradient reads across the filled portion. */}
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full rounded-full transition-all duration-500",
        variant === "ramp" ? "fill-data-ramp" : "bg-notion-primary"
      )}
      style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
