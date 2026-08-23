import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
}

export function Card({ hover, gradient, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "ues-card",
        hover && "transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-ues/30 cursor-pointer",
        gradient && "relative overflow-hidden before:absolute before:inset-0 before:rounded-2xl before:bg-card-gradient before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display font-bold text-base text-[var(--color-mint)]", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardSubtitle({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-mint-700 mt-1", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}
