import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-9 pt-8 pb-0 mb-8">
      <div>
        <h1 className="font-display font-extrabold text-[1.7rem] tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-mint-700 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
