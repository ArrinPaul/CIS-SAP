import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/core/utils/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default: "bg-notion-primary text-notion-on-primary",
        secondary: "bg-notion-sunken text-notion-ink-secondary",
        outline: "border border-notion-hairline bg-transparent text-notion-ink-secondary",
        /* Delta / status chips — the only place color is allowed. */
        destructive: "bg-data-negative-soft text-data-negative",
        success: "bg-data-positive-soft text-data-positive",
        warning: "bg-data-3/15 text-data-2",
        sticker: "bg-data-4/15 text-data-4",
        glass: "border border-white/20 bg-black/60 backdrop-blur-xl text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
