"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";
import { formatNumber } from "@/lib/data";
import type { Post } from "@/types";

const PLATFORM_META: Record<string, { icon: string; label: string; color: string }> = {
  instagram: { icon: "📸", label: "Instagram", color: "#FF6B6B" },
  youtube: { icon: "▶️", label: "YouTube", color: "#FF0000" },
  x: { icon: "𝕏", label: "X / Twitter", color: "#F7FFF7" },
  twitter: { icon: "𝕏", label: "X / Twitter", color: "#F7FFF7" },
  linkedin: { icon: "💼", label: "LinkedIn", color: "#0A66C2" },
  tiktok: { icon: "🎵", label: "TikTok", color: "#69C9D0" },
  facebook: { icon: "📘", label: "Facebook", color: "#1877F2" },
  threads: { icon: "🧵", label: "Threads", color: "#000000" },
};

const PLATFORM_FILTERS = [
  { label: "All Platforms", value: "all" },
  { label: "YouTube", value: "youtube" },
  { label: "Facebook", value: "facebook" },
  { label: "X / Twitter", value: "x" },
  { label: "Instagram", value: "instagram" },
];

const scoreColor = (s: number) =>
  s >= 85 ? "#4ECDC4" : s >= 70 ? "#4ECDC4" : s >= 55 ? "rgba(247,255,247,0.7)" : "#FF6B6B";

export default function ContentPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    allPosts,
    checkingYoutubeConnection,
    platformErrors,
    deletePost,
    refreshNow,
    triggerFullSync,
  } = useRealTimePosts();

  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "views" | "ues" | "likes">("newest");
  const [search, setSearch] = useState("");

  const handleSync = async () => {
    setIsSyncing(true);
    const report = await triggerFullSync();
    if (report) {
      setSyncReport(report);
    }
    setIsSyncing(false);
  };

  // Reset page when filter/search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, sortBy]);

  // Filter and sort
  const filtered = allPosts
    .filter((p: Post) => {
      const platformKey = (p.platform as string) === "twitter" ? "x" : p.platform;
      if (filter !== "all" && platformKey !== filter) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a: Post, b: Post) => {
      const aViews = typeof a.metrics?.views === "number" ? a.metrics.views : -1;
      const bViews = typeof b.metrics?.views === "number" ? b.metrics.views : -1;
      const aLikes = typeof a.metrics?.likes === "number" ? a.metrics.likes : -1;
      const bLikes = typeof b.metrics?.likes === "number" ? b.metrics.likes : -1;

      if (sortBy === "views") return bViews - aViews;
      if (sortBy === "ues") return b.uesScore - a.uesScore;
      if (sortBy === "likes") return bLikes - aLikes;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedPosts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Count by platform
  const platformCounts = allPosts.reduce((acc, p) => {
    const platformKey = (p.platform as string) === "twitter" ? "x" : p.platform;
    acc[platformKey] = (acc[platformKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!mounted) {
    return (
      <div className="page-enter">
        <PageHeader
          title="Posts / Content"
          subtitle="Tracked content across all connected platforms"
        />
        <div className="px-9 pb-9">
          <div className="flex items-center gap-3 mb-6 text-sm text-mint-700">
            <div className="w-4 h-4 border-2 border-cyan-ues border-t-transparent rounded-full animate-spin" />
            Loading content...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Posts / Content"
        subtitle="Tracked content across all connected platforms"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="px-4 border-cyan-border/30 text-mint-700 hover:text-cyan-ues flex items-center gap-2"
            >
              <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
              {isSyncing ? "Syncing..." : "Sync Feed"}
            </Button>
            <Link href="/posts/add">
              <Button variant="primary" className="px-5 font-semibold">+ Add Post</Button>
            </Link>
          </div>
        }
      />

      <div className="px-9 pb-9">
        {/* Live Progress Banner */}
        {isSyncing && (
          <div className="mb-6 rounded-2xl border border-cyan-border/40 bg-cyan-mid/30 p-4 text-sm text-[var(--color-mint)] shadow-md animate-pulse">
            <div className="font-display font-bold text-cyan-ues flex items-center gap-2 mb-1">
              <span className="animate-spin">🔄</span> Synchronizing connected platforms & updating database...
            </div>
            <p className="text-xs text-mint-600">
              Fetching latest posts from YouTube, Instagram, X/Twitter, and Facebook. Please wait.
            </p>
          </div>
        )}

        {/* Sync Report Banner */}
        {syncReport && !isSyncing && (
          <div className="mb-6 rounded-2xl border border-cyan-border/30 bg-teal-card p-4 text-sm text-[var(--color-mint)] shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="font-display font-bold text-cyan-ues flex items-center gap-2">
                <span>🔄</span> Synchronization Complete
              </div>
              <span className="text-xs text-mint-700 font-mono">
                {new Date(syncReport.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-xs text-mint-600 mb-3">
              Synced {syncReport.totalChecked} posts · {syncReport.totalNew} new · {syncReport.totalDeleted} deleted · {syncReport.totalUpdated} updated
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(syncReport.platformResults || {}).map(([plat, res]: [string, any]) => (
                <Badge
                  key={plat}
                  variant={res.status === "success" ? "cyan" : "pink"}
                  className="text-xs flex items-center gap-1.5 px-3 py-1"
                >
                  <span className="capitalize">{plat}</span>
                  <span>{res.status === "success" ? "✓" : "✗"}</span>
                  {res.status === "success" && (
                    <span className="text-[10px] opacity-80">({res.checkedCount} posts)</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Errors Banner */}
        {platformErrors && platformErrors.length > 0 && (
          <div className="mb-6 rounded-2xl border border-pink-ues/20 bg-pink-ues/[0.03] p-4 text-sm text-pink-ues/90">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <span>⚠️</span> Some platforms could not sync:
            </div>
            <ul className="list-disc pl-8 space-y-1 text-xs">
              {platformErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Loading State */}
        {checkingYoutubeConnection && (
          <div className="flex items-center gap-3 mb-6 text-sm text-mint-700">
            <div className="w-4 h-4 border-2 border-cyan-ues border-t-transparent rounded-full animate-spin" />
            Syncing content from connected platforms...
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {PLATFORM_FILTERS.map((f) => {
            const count = f.value === "all" ? allPosts.length : (platformCounts[f.value] || 0);
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                suppressHydrationWarning
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                  filter === f.value
                    ? "bg-cyan-mid text-cyan-ues shadow-sm border-cyan-ues"
                    : "bg-teal-card/50 text-mint-700 hover:bg-teal-card hover:text-[var(--color-mint)] border border-cyan-border/8"
                }`}
              >
                {f.value !== "all" && PLATFORM_META[f.value]?.icon + " "}{f.label}
                {mounted ? ` (${count})` : ""}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-3">
            <input
              type="text"
              placeholder="Search content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border border-cyan-border/20 text-[var(--color-mint)] text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-ues transition-colors min-w-[200px]"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border border-cyan-border/20 text-[var(--color-mint)] text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-ues transition-colors appearance-none pr-8 relative cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234ECDC4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1rem',
              }}
            >
              <option value="newest" className="bg-[#0b191c]">Newest</option>
              <option value="views" className="bg-[#0b191c]">Most Views</option>
              <option value="likes" className="bg-[#0b191c]">Most Likes</option>
              <option value="ues" className="bg-[#0b191c]">Highest UES</option>
            </select>
          </div>
        </div>

        {/* Content Grid */}
        {filtered.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="font-display font-bold text-lg mb-2">No Content Found</h3>
            <p className="text-sm text-mint-700 mb-4">
              {allPosts.length === 0
                ? "Connect your platforms and start publishing to see your content here."
                : "No content matches your current filters."}
            </p>
            {allPosts.length === 0 && (
              <div className="flex items-center justify-center gap-3">
                <Link href="/connect">
                  <Button variant="primary" size="sm">Connect Platforms</Button>
                </Link>
                <Link href="/posts/add">
                  <Button variant="ghost" size="sm">Publish Content</Button>
                </Link>
              </div>
            )}
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paginatedPosts.map((post: Post) => {
                const platformKey = post.platform;
                const meta = PLATFORM_META[platformKey] || { icon: "📄", label: platformKey, color: "#999" };
                return (
                  <Card
                    key={post.id}
                    className="group hover:border-cyan-border/40 transition-all duration-200 cursor-pointer overflow-hidden p-0 border border-cyan-border/20 bg-teal-surface/20 shadow-sm"
                  >
                    {/* Thumbnail / Header */}
                    <div
                      className="relative w-full h-44 bg-teal-surface/50 overflow-hidden"
                      onClick={() => post.url && window.open(post.url, "_blank", "noopener,noreferrer")}
                    >
                      {post.thumbnailUrl ? (
                        <img
                          src={post.thumbnailUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                               const fallback = parent.querySelector('.platform-fallback');
                               if (fallback) fallback.classList.remove('hidden');
                            }
                          }}
                        />
                      ) : null}
                      
                      {/* Fallback backgrounds when no thumbnail exists or if it fails */}
                      <div className={`platform-fallback absolute inset-0 w-full h-full ${post.thumbnailUrl ? 'hidden' : ''}`}>
                        {platformKey === 'x' ? (
                          <div className="w-full h-full bg-[#0f1419] flex items-center justify-center">
                            <span className="text-7xl text-white/10 font-serif" style={{ fontFamily: 'Georgia, serif' }}>X</span>
                          </div>
                        ) : platformKey === 'facebook' ? (
                          <div 
                            className="w-full h-full relative overflow-hidden" 
                            style={{
                              background: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
                            }}
                          >
                            <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] rounded-[40%] bg-white/10" style={{ transform: 'rotate(15deg)' }} />
                            <div className="absolute bottom-[-30%] right-[-10%] w-[100%] h-[100%] rounded-[50%] bg-white/20" />
                          </div>
                        ) : platformKey === 'youtube' ? (
                          <div className="w-full h-full bg-[#d1d5db] flex items-center justify-center">
                            <div className="w-24 h-16 bg-[#9ca3af] rounded-3xl flex items-center justify-center gap-2.5 shadow-inner">
                              <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                              <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                              <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-teal-card/50 flex items-center justify-center">
                            <span className="text-5xl opacity-20">{meta.icon}</span>
                          </div>
                        )}
                      </div>

                      {/* Platform badge overlay */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md bg-black/40 text-white shadow-sm">
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      {/* Delete Button & UES Score overlay */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          title="Delete post from app and origin platform"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this post from your feed?")) {
                              deletePost(post.id, post.platform);
                            }
                          }}
                          className="w-9 h-9 rounded-full text-xs backdrop-blur-md bg-black/60 text-pink-ues hover:bg-pink-ues hover:text-white transition-all flex items-center justify-center shadow-md z-10 border border-pink-ues/30"
                        >
                          🗑️
                        </button>
                        <span
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full font-display font-extrabold text-sm backdrop-blur-md shadow-sm"
                          style={{
                            backgroundColor: "rgba(0,0,0,0.5)",
                            color: scoreColor(post.uesScore),
                          }}
                        >
                          {post.uesScore}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3
                        className="font-medium text-[15px] text-[var(--color-mint)] line-clamp-2 mb-3 min-h-[2.5rem] leading-snug"
                        title={post.title}
                      >
                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-cyan-ues transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {post.title}
                          </a>
                        ) : (
                          post.title
                        )}
                      </h3>

                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant={post.status === "active" ? "cyan" : "teal"} className="px-3">
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </Badge>
                        <Badge variant="teal" className="px-3">
                          {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                        </Badge>
                        <span className="ml-auto text-xs font-medium text-mint-700">{post.publishedAt}</span>
                      </div>

                      {/* Metrics row */}
                      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-cyan-border/10">
                        <div className="text-center">
                          <div className="text-[10px] font-semibold text-mint-700 uppercase tracking-widest mb-1">Views</div>
                          <div className="font-display font-extrabold text-[15px] text-cyan-ues">
                            {formatNumber(post.metrics?.views)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-semibold text-mint-700 uppercase tracking-widest mb-1">Likes</div>
                          <div className="font-display font-extrabold text-[15px] text-[var(--color-mint)]">
                            {formatNumber(post.metrics?.likes)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-semibold text-mint-700 uppercase tracking-widest mb-1">Comments</div>
                          <div className="font-display font-extrabold text-[15px] text-[var(--color-mint)]">
                            {formatNumber(post.metrics?.comments)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] font-semibold text-mint-700 uppercase tracking-widest mb-1">Shares</div>
                          <div className="font-display font-extrabold text-[15px] text-[var(--color-mint)]">
                            {formatNumber(post.metrics?.shares)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-cyan-border/15">
                <p className="text-xs text-mint-700 font-medium">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} posts
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 text-xs border-cyan-border/30 disabled:opacity-40"
                  >
                    ← Previous
                  </Button>
                  <span className="text-xs font-display font-semibold text-cyan-ues px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 text-xs border-cyan-border/30 disabled:opacity-40"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
