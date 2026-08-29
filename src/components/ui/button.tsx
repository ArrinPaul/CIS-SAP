import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/core/utils/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-body-sm font-medium",
    "transition-[background-color,box-shadow,transform,color] duration-150 ease-out",
    // Keyboard focus gets a visible ring; pointer focus does not.
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Disabled reads as disabled, and stops responding to the pointer.
    "disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
    // Async states: callers pass data-loading to freeze interaction.
    "data-[loading=true]:pointer-events-none data-[loading=true]:opacity-70",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform",
    "active:scale-[0.97] active:duration-75",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-notion-primary text-notion-on-primary rounded-full hover:bg-notion-primary-active hover:shadow-notion-soft",
        primary:
          "bg-notion-primary text-notion-on-primary rounded-full shadow-notion-soft hover:bg-notion-primary-active hover:shadow-notion-elevated hover:-translate-y-px",
        secondary:
          "bg-notion-surface text-notion-ink rounded-full shadow-notion-soft hover:bg-accent hover:shadow-notion-elevated hover:-translate-y-px",
        utility:
          "bg-notion-surface text-notion-ink shadow-notion-soft rounded-full hover:bg-accent hover:shadow-notion-elevated px-4 py-1",
        ghost:
          "text-notion-ink-secondary rounded-full hover:bg-accent hover:text-notion-ink",
        link:
          "text-notion-ink underline underline-offset-4 decoration-notion-ink-faint hover:decoration-notion-ink hover:underline-offset-2 active:scale-100",
        outline:
          "bg-transparent border border-notion-hairline text-notion-ink rounded-full hover:bg-accent hover:border-notion-ink-faint",
        destructive:
          "bg-destructive text-destructive-foreground rounded-full hover:brightness-110 hover:shadow-notion-soft",
        soft:
          "bg-notion-sunken text-notion-ink rounded-full hover:bg-accent hover:shadow-notion-soft",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-3.5 text-caption",
        lg: "h-12 px-7 text-body-md",
        icon: "h-10 w-10 rounded-full p-0 [&_svg]:size-[18px] active:scale-[0.94]",
        pill: "h-8 px-3.5 text-caption rounded-full",
        xl: "h-14 px-9 text-title",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
