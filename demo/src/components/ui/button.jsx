import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
        active: "bg-zinc-700 text-cyan-400 border border-cyan-400/50",
        ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
      },
      size: {
        default: "h-7 px-2.5",
        sm: "h-6 px-2 text-[11px]",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
