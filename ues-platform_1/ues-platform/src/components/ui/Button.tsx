import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "pink" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-cyan-ues text-teal-dark hover:bg-[#5de0d7] hover:-translate-y-px shadow-cyan-glow/0 hover:shadow-cyan-glow",
  pink:
    "bg-pink-ues text-white hover:bg-[#ff8080] hover:-translate-y-px shadow-pink-glow/0 hover:shadow-pink-glow",
  outline:
    "bg-transparent border border-cyan-border text-cyan-ues hover:border-cyan-ues hover:bg-cyan-light",
  ghost:
    "bg-mint-50 border border-mint-100 text-[var(--color-mint)] hover:bg-mint-100",
  danger:
    "bg-transparent text-pink-ues/70 hover:bg-pink-light hover:text-pink-ues",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-2 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-[10px] gap-2",
  lg: "px-8 py-3.5 text-base rounded-xl gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-display font-semibold",
          "transition-all duration-200 cursor-pointer select-none",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
