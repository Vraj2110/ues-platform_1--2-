import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/data";
import type { Post } from "@/types";
import { getPlatformIcon } from "@/components/ui/PlatformIcons";

const platformIcons: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  facebook: "📘",
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
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
  post: "teal",
};

const scoreColor = (score: number) =>
  score >= 85 ? "#4ECDC4" : score >= 70 ? "#4ECDC4" : score >= 55 ? "rgba(247,255,247,0.7)" : "#FF6B6B";

interface PostRowProps {
  post: Post;
  onDelete?: (postId: string) => void;
}

export function PostRow({ post, onDelete }: PostRowProps) {
  const hasUrl = !!post.url;

  const handleRowClick = () => {
    if (post.url && typeof window !== "undefined") {
      window.open(post.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(post.id);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`group border-b border-cyan-border/6 transition-colors duration-150 ${
        hasUrl ? "hover:bg-cyan-light/10 cursor-pointer" : "hover:bg-cyan-light/5"
      }`}
    >
      <td className="px-4 py-3.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="flex items-center min-h-[20px]">{getPlatformIcon(post.platform, "sm") || platformIcons[post.platform]}</span>
          <span className="text-mint-700 font-medium">{platformNames[post.platform]}</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm max-w-[340px]">
        <div className="flex items-center gap-3 truncate">
          {post.thumbnailUrl ? (
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className="w-10 h-7 object-cover rounded border border-cyan-border/20 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : null}
          {hasUrl ? (
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--color-mint)] group-hover:text-cyan-ues hover:underline flex items-center gap-1.5 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">{post.title}</span>
              <span className="text-xs text-cyan-ues opacity-70 group-hover:opacity-100 flex-shrink-0">↗</span>
            </a>
          ) : (
            <p className="truncate text-[var(--color-mint)]">{post.title}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-mint-700">{post.publishedAt}</td>
      <td className="px-4 py-3.5">
        <Badge variant={typeVariant[post.type] ?? "teal"}>
          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
        </Badge>
      </td>
      <td className="px-4 py-3.5 text-sm text-cyan-ues font-semibold">
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
      <td className="px-4 py-3.5 flex items-center justify-between gap-2">
        <Badge variant={post.status === "active" ? "cyan" : "teal"}>
          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
        </Badge>
        {onDelete ? (
          <button
            onClick={handleDelete}
            title="Remove content"
            className="opacity-0 group-hover:opacity-100 p-1 text-xs text-pink-ues hover:bg-pink-ues/10 rounded transition-opacity"
          >
            🗑️
          </button>
        ) : null}
      </td>
    </tr>
  );
}
