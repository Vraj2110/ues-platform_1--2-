import type { Platform } from "@/types";

interface PlatformScoreRowProps {
  platform: Platform;
}

const colorMap: Record<string, string> = {
  instagram: "#FF6B6B",
  youtube: "#4ECDC4",
  twitter: "rgba(247,255,247,0.6)",
  linkedin: "rgba(78,205,196,0.7)",
};

export function PlatformScoreRow({ platform }: PlatformScoreRowProps) {
  const color = colorMap[platform.id] ?? "#4ECDC4";
  const score = platform.uesScore ?? 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-7 text-center leading-none">{platform.icon}</span>
      <span className="text-sm flex-1">{platform.name}</span>
      <div className="flex-[2] h-1.5 bg-mint-50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span
        className="font-display font-bold text-sm w-9 text-right"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
