import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/data";
import type { Post } from "@/types";

const platformIcons: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  twitter: "🐦",
  linkedin: "💼",
  tiktok: "🎵",
  facebook: "📘",
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  facebook: "Facebook",
};

const typeVariant: Record<string, "cyan" | "pink" | "teal"> = {
  reel: "pink",
  video: "cyan",
  photo: "pink",
  thread: "teal",
  article: "teal",
  story: "teal",
  short: "cyan",
};

const scoreColor = (score: number) =>
  score >= 85 ? "#4ECDC4" : score >= 70 ? "#4ECDC4" : score >= 55 ? "rgba(247,255,247,0.7)" : "#FF6B6B";

interface PostRowProps {
  post: Post;
}

export function PostRow({ post }: PostRowProps) {
  return (
    <tr className="group border-b border-cyan-border/6 hover:bg-cyan-light/40 transition-colors duration-150">
      <td className="px-4 py-3.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{platformIcons[post.platform]}</span>
          <span className="text-mint-700">{platformNames[post.platform]}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm max-w-[280px]">
        <p className="truncate">{post.title}</p>
      </td>
      <td className="px-4 py-3.5 text-sm text-mint-700">{post.publishedAt}</td>
      <td className="px-4 py-3.5">
        <Badge variant={typeVariant[post.type] ?? "teal"}>
          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
        </Badge>
      </td>
      <td className="px-4 py-3.5 text-sm text-mint-700">
        {formatNumber(post.metrics.views)}
      </td>
      <td className="px-4 py-3.5">
        <span
          className="font-display font-bold text-sm"
          style={{ color: scoreColor(post.uesScore) }}
        >
          {post.uesScore}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={post.status === "active" ? "cyan" : "teal"}>
          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
        </Badge>
      </td>
    </tr>
  );
}
