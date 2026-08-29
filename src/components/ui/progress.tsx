"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/core/utils/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-notion-sunken",
      className
    )}
    {...props}
  >
    {/* Width, not translate, so the warm ramp reads across the filled portion. */}
    <ProgressPrimitive.Indicator
      className="h-full rounded-full fill-data-ramp transition-all duration-500"
      style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

