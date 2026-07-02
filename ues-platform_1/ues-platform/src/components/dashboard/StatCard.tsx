import { cn } from "@/lib/utils";
import type { DashboardStat } from "@/types";

export function StatCard({ stat }: { stat: DashboardStat }) {
  return (
    <div className="ues-card hover:-translate-y-0.5 transition-transform duration-200">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
        style={{ background: stat.iconBg ?? "rgba(78,205,196,0.1)" }}
      >
        {stat.icon}
      </div>
      <p className="text-[11px] uppercase tracking-widest text-mint-700 font-semibold mb-3">
        {stat.label}
      </p>
      <p className="font-display font-extrabold text-4xl leading-none">
        {stat.value}
        {stat.unit && (
          <span className="text-xl font-medium text-mint-700">{stat.unit}</span>
        )}
      </p>
      {stat.change && (
        <p
          className={cn(
            "text-xs mt-2",
            stat.changeDirection === "up" && "text-cyan-ues",
            stat.changeDirection === "down" && "text-pink-ues",
            stat.changeDirection === "neutral" && "text-mint-700"
          )}
        >
          {stat.change}
        </p>
      )}
    </div>
  );
}
