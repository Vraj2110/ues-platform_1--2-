import type { Platform } from "@/types";
import { getPlatformIcon } from "@/components/ui/PlatformIcons";

interface PlatformScoreRowProps {
  platform: Platform;
}

const colorMap: Record<string, string> = {
  instagram: "#FF6B6B",
  youtube: "#4ECDC4",
  facebook: "#1877F2",
};

export function PlatformScoreRow({ platform }: PlatformScoreRowProps) {
  const color = colorMap[platform.id] ?? "#4ECDC4";
  const score = platform.uesScore ?? 0;

  return (
    <div className="flex items-center gap-3">
      <span className="w-7 flex items-center justify-center min-h-[20px]">
        {getPlatformIcon(platform.id, "sm") || platform.icon}
      </span>
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
