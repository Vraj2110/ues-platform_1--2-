import { cn } from "@/lib/utils";

interface UESRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { r: 32, size: 80, strokeWidth: 8, fontSize: "text-2xl" },
  md: { r: 42, size: 104, strokeWidth: 10, fontSize: "text-3xl" },
  lg: { r: 56, size: 136, strokeWidth: 12, fontSize: "text-5xl" },
};

export function UESRing({ score, size = "md", showLabel = true, className }: UESRingProps) {
  const { r, size: svgSize, strokeWidth, fontSize } = sizeMap[size];
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 85 ? "#4ECDC4" : score >= 70 ? "#4ECDC4" : score >= 55 ? "rgba(247,255,247,0.7)" : "#FF6B6B";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={r}
          fill="none"
          stroke="rgba(78,205,196,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display font-extrabold leading-none", fontSize)} style={{ color }}>
          {score}
        </span>
        {showLabel && (
          <span className="text-[10px] text-mint-700 font-body mt-0.5">/100</span>
        )}
      </div>
    </div>
  );
}
