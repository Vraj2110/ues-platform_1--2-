"use client";

import Link from "next/link";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";

const platformIcons: Record<string, string> = {
  instagram: "📸", youtube: "▶️", x: "🐦", twitter: "🐦", linkedin: "💼", tiktok: "🎵", facebook: "📘"
};

const platformNames: Record<string, string> = {
  instagram: "Instagram", youtube: "YouTube", x: "X / Twitter", twitter: "X / Twitter", linkedin: "LinkedIn", tiktok: "TikTok", facebook: "Facebook"
};

const scoreColor = (s: number) => s >= 70 ? "#4ECDC4" : "#FF6B6B";

export function RecentPostsWidget() {
  const { allPosts } = useRealTimePosts();
  const recentPosts = allPosts.slice(0, 4);

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div>
          <CardTitle>Recent Posts</CardTitle>
          <CardSubtitle>Latest content across all platforms</CardSubtitle>
        </div>
        <Link href="/posts">
          <Button variant="ghost" size="sm">View all →</Button>
        </Link>
      </div>
      <div className="space-y-2">
        {recentPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => {
              if (post.url && typeof window !== "undefined") {
                window.open(post.url, "_blank", "noopener,noreferrer");
              }
            }}
            className={`flex items-center gap-3.5 p-3.5 rounded-xl bg-teal-surface border border-cyan-border/8 transition-all duration-200 ${post.url ? "hover:border-cyan-border/25 cursor-pointer hover:bg-cyan-light/10" : "hover:bg-cyan-light/5"}`}
          >
            <div className="w-9 h-9 rounded-lg bg-teal-card flex items-center justify-center text-xl flex-shrink-0">
              {platformIcons[post.platform] || "📄"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{post.title}</p>
              <p className="text-xs text-mint-700 mt-0.5">
                {platformNames[post.platform] || post.platform} · {post.publishedAt}
              </p>
            </div>
            <span className="font-display font-bold text-sm" style={{ color: scoreColor(post.uesScore) }}>
              {post.uesScore}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
