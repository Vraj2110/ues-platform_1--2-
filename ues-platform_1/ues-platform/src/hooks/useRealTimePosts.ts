"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { POSTS } from "@/lib/data";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";
import type { Post } from "@/types";

// Client-side cache to persist state across page navigation
let cachedYoutubeConnected = false;
let cachedConnectedPlatforms = new Set<string>(["facebook", "youtube", "x", "instagram"]);
let cachedCheckingYoutubeConnection = false;
let cachedLiveYoutubePosts: Post[] = [];
let cachedLivePlatformPosts: Post[] = [];
let cachedCustomPosts: Post[] = [];
let cachedPlatformErrors: string[] = [];
let hasFetchedPostsOnce = false;

function getInitialConnections(): { ytConnected: boolean; set: Set<string> } {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("ues_connections");
      if (cached) {
        const parsed = JSON.parse(cached);
        const set = new Set<string>();
        Object.keys(parsed).forEach((k) => {
          if (parsed[k]?.connected) set.add(k);
        });
        if (set.size > 0) {
          return { ytConnected: !!parsed?.youtube?.connected, set };
        }
      }
    } catch {}
  }
  return { ytConnected: true, set: new Set(["facebook", "youtube", "x", "instagram"]) };
}

function getInitialCustomPosts(): Post[] {
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("ues_custom_posts");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy static mock posts (p1..p7)
          const filtered = parsed.filter((p: any) => !p.id?.match(/^p[1-9]$/));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
  }
  return [];
}

export function useRealTimePosts() {
  const initialConns = getInitialConnections();
  const [youtubeConnected, setYoutubeConnected] = useState(cachedYoutubeConnected || initialConns.ytConnected);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(cachedConnectedPlatforms.size > 0 ? cachedConnectedPlatforms : initialConns.set);
  const [checkingYoutubeConnection, setCheckingYoutubeConnection] = useState(false);
  const [liveYoutubePosts, setLiveYoutubePosts] = useState<Post[]>(cachedLiveYoutubePosts);
  const [livePlatformPosts, setLivePlatformPosts] = useState<Post[]>(cachedLivePlatformPosts);
  const [customPosts, setCustomPosts] = useState<Post[]>(cachedCustomPosts.length > 0 ? cachedCustomPosts : getInitialCustomPosts());
  const [platformErrors, setPlatformErrors] = useState<string[]>(cachedPlatformErrors);

  const fetchData = useCallback(async (user?: any) => {
    try {
      let token = "";
      if (user) {
        try {
          token = await user.getIdToken();
        } catch {}
      } 
      const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};

      // ── Phase 1: Fast Database Fetching (Connections & Saved Database Posts) ──
      const [connRes, customRes] = await Promise.all([
        fetch("/api/connections", { headers }).catch(() => null),
        fetch("/api/posts/custom", { headers }).catch(() => null),
      ]);

      // ── Phase 1 Parse & Render: Connections ──
      let ytConnected = true;
      let activeSet = new Set<string>(["facebook", "youtube", "x", "instagram"]);
      if (connRes && connRes.ok) {
        const data = await connRes.json();
        ytConnected = Array.isArray(data) && data.some((c: any) => c.platformId === "youtube" && c.connected);
        const newActiveSet = new Set<string>();
        if (Array.isArray(data) && data.length > 0) {
          const map: Record<string, any> = {};
          data.forEach((c: any) => {
            if (c?.platformId) {
              map[c.platformId] = c;
              if (c.connected) newActiveSet.add(c.platformId);
            }
          });
          localStorage.setItem("ues_connections", JSON.stringify(map));
          activeSet = newActiveSet;
        }
      }

      cachedYoutubeConnected = ytConnected;
      cachedConnectedPlatforms = activeSet;
      setYoutubeConnected(ytConnected);
      setConnectedPlatforms(activeSet);

      // ── Phase 1 Parse & Render: Custom posts (Authoritative Synced Posts) ──
      if (customRes && customRes.ok) {
        const customData = await customRes.json();
        if (Array.isArray(customData.posts)) {
          const realCustomPosts = customData.posts.filter((p: any) => !p.id?.match(/^p[1-9]$/));
          if (realCustomPosts.length > 0) {
            cachedCustomPosts = realCustomPosts;
            setCustomPosts(realCustomPosts);
            if (typeof window !== "undefined") {
              localStorage.setItem("ues_custom_posts", JSON.stringify(realCustomPosts));
            }
          }
        }
      }

      // ── Phase 2: Live Platform Feeds (Background) ──
      const [videosRes, platformRes] = await Promise.all([
        ytConnected ? fetch("/api/connections/youtube/videos", { headers }).catch(() => null) : Promise.resolve(null),
        fetch(`/api/connections/platform-posts?_t=${Date.now()}`, { headers }).catch(() => null),
      ]);

      // ── Phase 2 Parse: YouTube live videos ──
      if (ytConnected && videosRes && videosRes.ok) {
        const videoData = await videosRes.json();
        if (Array.isArray(videoData.videos) && videoData.videos.length > 0) {
          const fetchedYoutubePosts = videoData.videos
            .filter((v: any) => !v.privacyStatus || v.privacyStatus === "public")
            .map((v: any, index: number) => {
              const views = typeof v.views === "number" ? v.views : null;
              const likes = typeof v.likes === "number" ? v.likes : null;
              const comments = typeof v.comments === "number" ? v.comments : null;

              const metricsData = {
                likes,
                comments,
                shares: null,
                views,
                saves: null,
                reach: null,
                impressions: null,
                followerCount: v.followerCount || null,
                dataSource: "youtube_api",
                syncStatus: "success" as const,
              };

              const { score, engagementRate } = calculateUnifiedEngagement(metricsData);

              return {
                id: `yt-live-${v.id || index}`,
                platform: "youtube" as const,
                title: v.title || "YouTube Channel Video",
                thumbnailUrl: v.thumbnailUrl || undefined,
                url: v.id ? `https://www.youtube.com/watch?v=${v.id}` : undefined,
                type: "video" as const,
                status: "active" as const,
                privacyStatus: "public",
                metrics: {
                  ...metricsData,
                  engagementRate,
                },
                uesScore: score,
                publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              } as Post;
            });

          cachedLiveYoutubePosts = fetchedYoutubePosts;
          setLiveYoutubePosts(fetchedYoutubePosts);
        }
      }

      // ── Phase 2 Parse: Live posts from other platforms ──
      if (platformRes && platformRes.ok) {
        const platformData = await platformRes.json();
        if (Array.isArray(platformData.posts) && platformData.posts.length > 0) {
          cachedLivePlatformPosts = platformData.posts;
          setLivePlatformPosts(platformData.posts);
        }
        if (Array.isArray(platformData.errors)) {
          cachedPlatformErrors = platformData.errors;
          setPlatformErrors(platformData.errors);
        }
      }

      hasFetchedPostsOnce = true;
    } catch (err) {
      console.warn("[useRealTimePosts] fetch error:", err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let pollTimer: NodeJS.Timeout;

    // Initial fetch on mount
    fetchData(auth.currentUser);

    // Listen for custom refresh events triggered after publishing
    const handleRefreshEvent = () => {
      if (active) fetchData(auth.currentUser);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("ues-refresh-posts", handleRefreshEvent);
    }

    // Listen for auth changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (active) {
        fetchData(user);
      }
    });

    // Real-time polling every 25 seconds
    pollTimer = setInterval(() => {
      if (active) {
        fetchData(auth.currentUser);
      }
    }, 25000);

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("ues-refresh-posts", handleRefreshEvent);
      }
    };
  }, [fetchData]);

  const hasRealPosts = customPosts.length > 0 || liveYoutubePosts.length > 0 || livePlatformPosts.length > 0;
  const staticFallback = hasRealPosts ? [] : POSTS;

  // Normalize platform names (e.g., twitter -> x)
  // customPosts = DB synced posts (authoritative after POST /api/sync)
  const normCustom = customPosts.map((p) => ({
    ...p,
    platform: (p.platform as string) === "twitter" ? ("x" as const) : p.platform,
  }));

  // YouTube live posts from direct YouTube API (not stored in customPosts)
  const normYoutube = liveYoutubePosts.map((p) => ({
    ...p,
    platform: "youtube" as const,
  }));

  // Include both database posts and live platform posts, allowing the deduplication map below
  // to merge them seamlessly. This ensures live posts show up even if not fully database-synced yet.
  const normPlatform = livePlatformPosts
    .map((p) => ({
      ...p,
      platform: (p.platform as string) === "twitter" ? ("x" as const) : p.platform,
    }));

  const rawMerged = [
    ...normCustom,
    ...(youtubeConnected ? normYoutube : []),
    ...normPlatform,
    ...staticFallback,
  ];

  // Deduplicate strictly by composite key platform:rawId
  const postMap = new Map<string, Post>();
  let deletedIds = new Set<string>();
  if (typeof window !== "undefined") {
    try {
      const cachedDeleted = localStorage.getItem("ues_deleted_posts");
      if (cachedDeleted) {
        const parsed = JSON.parse(cachedDeleted);
        if (Array.isArray(parsed)) deletedIds = new Set(parsed);
      }
    } catch {}
  }

  rawMerged.forEach((p) => {
    const rawId = String((p as any).platformPostId || p.id || "").replace(
      /^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/,
      ""
    );
    const key = `${p.platform}:${rawId}`;
    if (!deletedIds.has(p.id) && !deletedIds.has(rawId)) {
      if (p.platform === "youtube" && p.privacyStatus && p.privacyStatus !== "public") {
        return;
      }
      if (!postMap.has(key)) {
        postMap.set(key, p);
      } else {
        const existing = postMap.get(key)!;
        // Prefer the entry with higher metrics (usually the live YouTube entry has more detail)
        if (p.metrics && (p.metrics.views || 0) >= (existing.metrics?.views || 0)) {
          postMap.set(key, p);
        }
      }
    }
  });

  const allPosts = Array.from(postMap.values()).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Log UI representation for Instagram posts
  if (typeof window !== "undefined") {
    allPosts.filter(p => p.platform === "instagram").forEach(p => {
      console.log(`[Instagram Sync Debug] UI representing post ID: ${p.id}`);
      console.log(`  - Title: ${p.title}`);
      console.log(`  - UI views: ${p.metrics?.views}`);
      console.log(`  - UI shares: ${p.metrics?.shares}`);
    });
  }

  // refreshNow triggers an immediate re-fetch of all platform data
  const refreshNow = useCallback(() => {
    const user = auth.currentUser;
    fetchData(user);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ues-refresh-posts"));
    }
  }, [fetchData]);

  // triggerFullSync calls /api/sync, awaits state update, and returns granular report
  const triggerFullSync = useCallback(async () => {
    try {
      const user = auth.currentUser;
      let token = "";
      if (user) {
        try {
          token = await user.getIdToken();
        } catch {}
      }
      const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });

      const data = await res.json();
      
      // Sequentially re-fetch client state from DB before resolving
      await fetchData(user);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ues-refresh-posts"));
      }

      if (data.success && data.report) {
        return data.report;
      }
      return null;
    } catch (err) {
      console.warn("Full sync trigger notice:", err);
      return null;
    }
  }, [fetchData]);

  const deletePost = useCallback(async (postId: string, platform?: string) => {
    setLivePlatformPosts((prev) => prev.filter((p) => p.id !== postId));
    setLiveYoutubePosts((prev) => prev.filter((p) => p.id !== postId));
    setCustomPosts((prev) => prev.filter((p) => p.id !== postId));

    // Update global cache
    cachedLivePlatformPosts = cachedLivePlatformPosts.filter((p) => p.id !== postId);
    cachedLiveYoutubePosts = cachedLiveYoutubePosts.filter((p) => p.id !== postId);
    cachedCustomPosts = cachedCustomPosts.filter((p) => p.id !== postId);

    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ues_deleted_posts");
        const list: string[] = cached ? JSON.parse(cached) : [];
        if (!list.includes(postId)) list.push(postId);
        localStorage.setItem("ues_deleted_posts", JSON.stringify(list));
      } catch {}
    }

    try {
      const user = auth.currentUser;
      let token = "";
      if (user) {
        token = await user.getIdToken();
      }
      await fetch("/api/posts/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ postId, platform }),
      });
    } catch (err) {
      console.warn("Delete API call notice:", err);
    }
  }, []);

  return {
    allPosts,
    youtubeConnected,
    connectedPlatforms,
    checkingYoutubeConnection,
    isLoading: checkingYoutubeConnection,
    liveYoutubePosts,
    livePlatformPosts,
    customPosts,
    platformErrors,
    setCustomPosts,
    setLiveYoutubePosts,
    setLivePlatformPosts,
    deletePost,
    refreshNow,
    triggerFullSync,
  };
}
