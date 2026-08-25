"use client";

import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";
import { getPlatformIcon } from "@/components/ui/PlatformIcons";

const platformIcons: Record<string, string> = {
  instagram: "📸", youtube: "▶️", facebook: "📘"
};

const platformNames: Record<string, string> = {
  instagram: "Instagram", youtube: "YouTube", facebook: "Facebook"
};

const scoreColor = (s: number) => s >= 70 ? "#4ECDC4" : "#FF6B6B";

export function TopPostsWidget() {
  const { allPosts } = useRealTimePosts();
  const topPosts = [...allPosts].sort((a, b) => b.uesScore - a.uesScore).slice(0, 3);

  return (
    <Card>
      <CardTitle>Top Performing Posts</CardTitle>
      <CardSubtitle>Highest UES scores this month</CardSubtitle>
      <div className="mt-5 space-y-3">
        {topPosts.map((post, i) => (
          <div
            key={post.id}
            onClick={() => {
              if (post.url && typeof window !== "undefined") {
                window.open(post.url, "_blank", "noopener,noreferrer");
              }
            }}
            className={`flex items-center gap-3 p-3 rounded-xl bg-teal-surface border border-cyan-border/8 ${post.url ? "cursor-pointer hover:border-cyan-border/25 hover:bg-cyan-light/10" : ""} transition-all duration-200`}
          >
            <span className="font-display font-extrabold text-lg text-mint-300 w-6">
              {i + 1}
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-card flex items-center justify-center flex-shrink-0">
              {getPlatformIcon(post.platform, "sm") || platformIcons[post.platform] || "📄"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{post.title}</p>
              <p className="text-xs text-mint-700">{platformNames[post.platform] || post.platform}</p>
            </div>
            <span
              className="font-display font-bold text-base"
              style={{ color: scoreColor(post.uesScore) }}
            >
              {post.uesScore}
            </span>
          </div>
        ))}
        {topPosts.length === 0 && (
          <p className="text-sm text-mint-700 text-center py-4">No posts yet.</p>
        )}
        <Button variant="ghost" size="sm" className="w-full mt-1">
          View all posts →
        </Button>
      </div>
    </Card>
  );
}
