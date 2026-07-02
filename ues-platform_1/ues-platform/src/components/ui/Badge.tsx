import { cn } from "@/lib/utils";

type BadgeVariant = "cyan" | "pink" | "teal" | "mint";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  cyan: "bg-cyan-mid text-cyan-ues",
  pink: "bg-pink-light text-pink-ues",
  teal: "bg-teal-surface border border-cyan-border/15 text-mint-700",
  mint: "bg-mint-50 text-[var(--color-mint)]",
};

export function Badge({ variant = "teal", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ConnectedBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 bg-cyan-mid text-cyan-ues text-xs font-semibold px-3 py-1 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-pulse-dot" />
      Connected
    </span>
  );
}

export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-cyan-ues font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-pulse-dot" />
      Live
    </span>
  );
}
