import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-orange-50 text-brand-orange-deep",
        outline: "border-slate-200 bg-white/80 text-foreground",
        success: "border-transparent bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
        warning: "border-transparent bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
        muted: "border-transparent bg-slate-100 text-slate-600 shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
