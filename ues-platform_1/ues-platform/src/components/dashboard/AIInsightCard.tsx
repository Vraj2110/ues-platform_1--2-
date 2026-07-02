import { cn } from "@/lib/utils";
import type { AIInsight } from "@/types";

const iconMap: Record<AIInsight["type"], string> = {
  trend: "📈",
  warning: "⚠️",
  prediction: "🔮",
  opportunity: "💡",
};

const iconBgMap: Record<AIInsight["type"], string> = {
  trend: "bg-cyan-mid",
  warning: "bg-pink-light",
  prediction: "bg-teal-surface border border-cyan-border/20",
  opportunity: "bg-cyan-mid",
};

const confidenceColor: Record<AIInsight["confidence"], string> = {
  high: "text-cyan-ues",
  medium: "text-mint-700",
  low: "text-pink-ues/70",
};

export function AIInsightCard({ insight }: { insight: AIInsight }) {
  return (
    <div className="flex gap-4 bg-teal-surface border border-cyan-border/12 rounded-2xl p-5 hover:border-cyan-border/30 transition-all duration-200 group">
      {/* Icon */}
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 mt-0.5",
          iconBgMap[insight.type]
        )}
      >
        {iconMap[insight.type]}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <h4 className="font-display font-bold text-[15px] mb-1.5">{insight.title}</h4>
        <p className="text-sm text-mint-700 leading-relaxed">{insight.body}</p>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[11px] text-mint-700/60">{insight.generatedAt}</span>
          <span className="w-1 h-1 rounded-full bg-mint-300" />
          <span className={cn("text-[11px] font-medium", confidenceColor[insight.confidence])}>
            Confidence: {insight.confidence.charAt(0).toUpperCase() + insight.confidence.slice(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
