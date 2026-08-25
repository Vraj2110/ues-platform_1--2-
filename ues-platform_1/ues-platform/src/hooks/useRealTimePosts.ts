"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { POSTS } from "@/lib/data";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";
import type { Post } from "@/types";

export function useRealTimePosts() {
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [checkingYoutubeConnection, setCheckingYoutubeConnection] = useState(true);
  const [liveYoutubePosts, setLiveYoutubePosts] = useState<Post[]>([]);
  const [livePlatformPosts, setLivePlatformPosts] = useState<Post[]>([]);
  const [customPosts, setCustomPosts] = useState<Post[]>([]);
  const [platformErrors, setPlatformErrors] = useState<string[]>([]);

  const fetchData = useCallback(async (user: any) => {
    try {
      let token = "";
      if (user) {
        try {
          token = await user.getIdToken();
        } catch {}
      }

      const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};

      // Fetch connections, YouTube videos, custom posts, and all platform posts in parallel
      const [connRes, videosRes, customRes, platformRes] = await Promise.all([
        fetch("/api/connections", { headers }).catch(() => null),
        fetch("/api/connections/youtube/videos", { headers }).catch(() => null),
        fetch("/api/posts/custom", { headers }).catch(() => null),
        fetch(`/api/connections/platform-posts?_t=${Date.now()}`, { headers }).catch(() => null),
      ]);

      // ── Connections ──────────────────────────────────────────────────────
      let ytConnected = false;
      const activeSet = new Set<string>();
      if (connRes && connRes.ok) {
        const data = await connRes.json();
        ytConnected = Array.isArray(data) && data.some((c: any) => c.platformId === "youtube" && c.connected);
        if (typeof window !== "undefined" && Array.isArray(data)) {
          const map: Record<string, any> = {};
          data.forEach((c: any) => {
            if (c?.platformId) {
              map[c.platformId] = c;
              if (c.connected) activeSet.add(c.platformId);
            }
          });
          localStorage.setItem("ues_connections", JSON.stringify(map));
        }
      } else if (typeof window !== "undefined") {
        const cachedConns = localStorage.getItem("ues_connections");
        if (cachedConns) {
          try {
            const parsed = JSON.parse(cachedConns);
            ytConnected = !!parsed?.youtube?.connected;
            Object.keys(parsed).forEach((k) => {
              if (parsed[k]?.connected) activeSet.add(k);
            });
          } catch {}
        }
      }

      // ── YouTube live videos (strictly public only) ───────────────────────
      let fetchedYoutubePosts: Post[] = [];
      if (ytConnected) {
        let videoItems: any[] = [];
        if (videosRes && videosRes.ok) {
          const videoData = await videosRes.json();
          if (Array.isArray(videoData.videos) && videoData.videos.length > 0) {
            videoItems = videoData.videos;
          }
        }

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

        fetchedYoutubePosts = videoItems
          .filter((v: any) => !deletedIds.has(v.id))
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
      }

      // ── Live posts from all other platforms ──
      let fetchedPlatformPosts: Post[] = [];
      let fetchedErrors: string[] = [];
      if (platformRes && platformRes.ok) {
        const platformData = await platformRes.json();
        if (Array.isArray(platformData.posts)) {
          fetchedPlatformPosts = platformData.posts as Post[];
        }
        if (Array.isArray(platformData.errors)) {
          fetchedErrors = platformData.errors as string[];
        }
      }

      // ── Custom posts ──
      let customUserPosts: Post[] = [];
      if (customRes && customRes.ok) {
        const customData = await customRes.json();
        if (Array.isArray(customData.posts)) {
          customUserPosts = customData.posts;
        }
      } else if (typeof window !== "undefined") {
        try {
          const cachedCustom = localStorage.getItem("ues_custom_posts");
          if (cachedCustom) {
            const parsed = JSON.parse(cachedCustom);
            if (Array.isArray(parsed)) customUserPosts = parsed;
          }
        } catch {}
      }

      // customPosts from /api/posts/custom already reflects the authoritative synced state.
      // Do NOT sanitize against fetchedPlatformPosts (which is only a partial live sample).
      // The sync engine (POST /api/sync) is the single source of truth.

      setYoutubeConnected(ytConnected);
      if (activeSet.size > 0) setConnectedPlatforms(activeSet);
      setLiveYoutubePosts(fetchedYoutubePosts);
      setLivePlatformPosts(fetchedPlatformPosts);
      setCustomPosts(customUserPosts);
      setPlatformErrors(fetchedErrors);
    } catch (err) {
      console.warn("[useRealTimePosts] fetch error:", err);
    } finally {
      setCheckingYoutubeConnection(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let pollInterval: NodeJS.Timeout;

    if (typeof window !== "undefined") {
      try {
        const cachedConns = localStorage.getItem("ues_connections");
        if (cachedConns) {
          const parsed = JSON.parse(cachedConns);
          const activeSet = new Set<string>();
          Object.keys(parsed).forEach((k) => {
            if (parsed[k]?.connected) activeSet.add(k);
          });
          setConnectedPlatforms(activeSet);
          if (parsed?.youtube?.connected) setYoutubeConnected(true);
        }
      } catch {}
    }

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
      fetchData(user);
    });

    // Poll every 10 seconds for real-time visibility across all platforms
    pollInterval = setInterval(() => {
      if (active) fetchData(auth.currentUser);
    }, 10000);

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("ues-refresh-posts", handleRefreshEvent);
      }
    };
  }, [fetchData]);

  // ── Build the merged post list ───────────────────────────────────────────
  const hasAnyConnection = youtubeConnected || connectedPlatforms.size > 0;

  // Static demo fallback — only show if NO real accounts are connected
  const staticFallback = POSTS.filter(() => !hasAnyConnection);

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

  // livePlatformPosts is a partial live sample (page-1 only).
  // We include it ONLY to fill platforms that have no DB posts yet.
  // Build a set of platforms already covered by DB (customPosts)
  const dbPlatforms = new Set(normCustom.map((p) => p.platform as string));

  // Only include live platform posts for platforms NOT already in DB store
  const normPlatform = livePlatformPosts
    .filter((p) => {
      const plat = (p.platform as string) === "twitter" ? "x" : p.platform;
      return !dbPlatforms.has(plat as string);
    })
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
