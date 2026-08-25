"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { POSTS } from "@/lib/data";
import type { Post } from "@/types";

export function useRealTimePosts() {
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());
  const [checkingYoutubeConnection, setCheckingYoutubeConnection] = useState(true);
  const [liveYoutubePosts, setLiveYoutubePosts] = useState<Post[]>([]);
  const [livePlatformPosts, setLivePlatformPosts] = useState<Post[]>([]);
  const [customPosts, setCustomPosts] = useState<Post[]>([]);
  const [platformErrors, setPlatformErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    let pollInterval: NodeJS.Timeout;

    // Seed from localStorage cache immediately while API loads
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

    const fetchData = async (user: any) => {
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
          fetch("/api/connections/platform-posts", { headers }).catch(() => null),
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
            .filter((v: any) => !v.privacyStatus || v.privacyStatus === "public") // STRICTLY PUBLIC ONLY
            .map((v: any, index: number) => {
              const realViews = typeof v.views === "number" ? v.views : 0;
              const realLikes = typeof v.likes === "number" ? v.likes : 0;
              const realComments = typeof v.comments === "number" ? v.comments : 0;

              const uesScore =
                realViews > 0
                  ? Math.min(
                      99,
                      Math.max(
                        65,
                        Math.round(
                          Math.log10(realViews + 1) * 14 +
                            ((realLikes * 3 + realComments * 6) / (realViews + 1)) * 40
                        )
                      )
                    )
                  : 85 + (index % 5);

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
                  likes: realLikes,
                  comments: realComments,
                  shares: Math.round(realLikes * 0.15),
                  views: realViews,
                  saves: 0,
                  followerCount: v.followerCount || 0,
                },
                uesScore,
                publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              } as Post;
            });
        }

        // ── Live posts from all other platforms (X, Instagram, FB, LI, Threads) ──
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

        // ── Custom posts (added manually via form) ───────────────────────────
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

        // Sanitize custom posts against live origin feeds to purge deleted posts
        if (typeof window !== "undefined" && customUserPosts.length > 0) {
          const livePlatformIds = new Set(fetchedPlatformPosts.map((p) => p.id));
          const livePlatformRawIds = new Set(
            fetchedPlatformPosts.map((p) => p.id.replace(/^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/, ""))
          );
          const ytRawIds = new Set(fetchedYoutubePosts.map((v) => v.id.replace(/^yt-live-/, "")));

          const sanitized = customUserPosts.filter((cp: any) => {
            // Newly uploaded posts within 3 minutes stay visible while origin API indexing propagates
            if (cp._addedAt && Date.now() - cp._addedAt < 3 * 60 * 1000) return true;

            const rawId = String(cp.id || "").replace(/^(ig-live-|ig-published-|ig-custom-|yt-live-|yt-)/, "");
            const isPlatformConnected = activeSet.has(cp.platform) || (cp.platform === "youtube" && ytConnected);

            if (isPlatformConnected) {
              if (cp.platform === "youtube" && fetchedYoutubePosts.length > 0) {
                if (ytRawIds.has(rawId) || ytRawIds.has(cp.id)) return true;
                return false;
              }
              if (fetchedPlatformPosts.some((p) => p.platform === cp.platform)) {
                if (livePlatformIds.has(cp.id) || livePlatformRawIds.has(rawId)) return true;
                return false;
              }
            }
            return true;
          });

          customUserPosts = sanitized;
          try {
            localStorage.setItem("ues_custom_posts", JSON.stringify(sanitized));
          } catch {}
        }

        if (active) {
          setYoutubeConnected(ytConnected);
          if (activeSet.size > 0) setConnectedPlatforms(activeSet);
          setLiveYoutubePosts(fetchedYoutubePosts);
          setLivePlatformPosts(fetchedPlatformPosts);
          setCustomPosts(customUserPosts);
          setPlatformErrors(fetchedErrors);
        }
      } catch (err) {
        console.warn("[useRealTimePosts] fetch error:", err);
      } finally {
        if (active) setCheckingYoutubeConnection(false);
      }
    };

    // Run immediately for current auth state (or unauthenticated demo state)
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
  }, []);

  // ── Build the merged post list ───────────────────────────────────────────

  const liveYtIds = new Set(liveYoutubePosts.map((p) => p.id));
  const livePlatformIds = new Set(livePlatformPosts.map((p) => p.id));
  const livePlatformRawIds = new Set(
    livePlatformPosts.map((p) => p.id.replace(/^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/, ""))
  );

  // Filter custom posts:
  // 1) Exclude duplicates already in live feeds
  // 2) If live origin feed for a connected platform exists and does NOT contain this post, IT WAS DELETED ON ORIGIN -> EXCLUDE IT!
  const validCustomPosts = customPosts.filter((p: any) => {
    const rawId = String(p.id || "").replace(/^(ig-live-|ig-published-|ig-custom-|yt-live-|yt-)/, "");
    const platformLiveCount = livePlatformPosts.filter((lp) => lp.platform === p.platform).length;

    // Newly uploaded posts within 3 minutes stay visible while origin API indexing propagates
    if (p._addedAt && Date.now() - p._addedAt < 3 * 60 * 1000) {
      if (livePlatformIds.has(p.id) || livePlatformRawIds.has(rawId) || liveYtIds.has(p.id)) return false;
      return true;
    }

    if (p.platform === "youtube") {
      if (p.privacyStatus && p.privacyStatus !== "public") return false; 
      const cleanId = p.id.replace(/^yt-/, "");
      if (liveYtIds.has(p.id) || liveYtIds.has(`yt-live-${cleanId}`)) return false;
      if (youtubeConnected && liveYoutubePosts.length > 0) return false;
      return false;
    }

    if (livePlatformIds.has(p.id) || livePlatformRawIds.has(rawId)) return false;
    
    if (connectedPlatforms.has(p.platform) && platformLiveCount > 0) {
      return false; // Deleted on origin platform!
    }

    return true;
  });

  const customPostIds = new Set(validCustomPosts.map((p) => p.id));

  // Static demo fallback — only show for platforms with no live data, 
  // BUT only if NO real accounts are connected. If they connected at least one, show only their real data.
  const hasAnyConnection = youtubeConnected || connectedPlatforms.size > 0;
  
  const staticFallback = POSTS.filter((p) => {
    if (hasAnyConnection) return false; // Do not mix fake data with real connected data
    
    if (customPostIds.has(p.id)) return false;
    if (p.platform === "youtube") return !youtubeConnected;
    return livePlatformPosts.filter((lp) => lp.platform === p.platform).length === 0;
  });

  const rawMerged = [
    ...validCustomPosts,
    ...(youtubeConnected ? liveYoutubePosts : []),
    ...livePlatformPosts,
    ...staticFallback,
  ];

  // Final Pass: Filter deleted posts and ensure public visibility
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

  const allPosts = rawMerged
    .filter((p) => {
      const cleanId = p.id.replace(/^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/, "");
      if (deletedIds.has(p.id) || deletedIds.has(cleanId)) return false;
      if (p.platform === "youtube") {
        return !p.privacyStatus || p.privacyStatus === "public";
      }
      return true;
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // refreshNow triggers an immediate re-fetch of all platform data
  const refreshNow = useCallback(() => {
    const user = auth.currentUser;
    if (user) {
      // Delay slightly to allow backend to propagate new post
      setTimeout(() => {
        // Trigger a re-render by dispatching a custom event
        window.dispatchEvent(new CustomEvent('ues-refresh-posts'));
      }, 1500);
    }
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handler = () => {
      const user = auth.currentUser;
      if (user) {
        user.getIdToken().then((token) => {
          const headers: Record<string, string> = { authorization: `Bearer ${token}` };
          Promise.all([
            fetch("/api/connections/youtube/videos", { headers }).catch(() => null),
            fetch("/api/connections/platform-posts", { headers }).catch(() => null),
            fetch("/api/posts/custom", { headers }).catch(() => null),
          ]).then(async ([videosRes, platformRes, customRes]) => {
            if (videosRes && videosRes.ok) {
              const videoData = await videosRes.json();
              if (Array.isArray(videoData.videos)) {
                const deletedIds = new Set<string>();
                try {
                  const cachedDeleted = localStorage.getItem("ues_deleted_posts");
                  if (cachedDeleted) {
                    const parsed = JSON.parse(cachedDeleted);
                    if (Array.isArray(parsed)) parsed.forEach((id: string) => deletedIds.add(id));
                  }
                } catch {}
                const ytPosts = videoData.videos
                  .filter((v: any) => !deletedIds.has(v.id))
                  .filter((v: any) => !v.privacyStatus || v.privacyStatus === "public")
                  .map((v: any, index: number) => {
                    const realViews = typeof v.views === "number" ? v.views : 0;
                    const realLikes = typeof v.likes === "number" ? v.likes : 0;
                    const realComments = typeof v.comments === "number" ? v.comments : 0;
                    const uesScore = realViews > 0
                      ? Math.min(99, Math.max(65, Math.round(Math.log10(realViews + 1) * 14 + ((realLikes * 3 + realComments * 6) / (realViews + 1)) * 40)))
                      : 85 + (index % 5);
                    return {
                      id: `yt-live-${v.id || index}`, platform: "youtube" as const,
                      title: v.title || "YouTube Channel Video", thumbnailUrl: v.thumbnailUrl || undefined,
                      url: v.id ? `https://www.youtube.com/watch?v=${v.id}` : undefined,
                      type: "video" as const, status: "active" as const, privacyStatus: "public",
                      metrics: { likes: realLikes, comments: realComments, shares: Math.round(realLikes * 0.15), views: realViews, saves: 0, followerCount: v.followerCount || 0 },
                      uesScore, publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                    } as Post;
                  });
                setLiveYoutubePosts(ytPosts);
              }
            }
            if (platformRes && platformRes.ok) {
              const platformData = await platformRes.json();
              if (Array.isArray(platformData.posts)) setLivePlatformPosts(platformData.posts as Post[]);
              if (Array.isArray(platformData.errors)) setPlatformErrors(platformData.errors);
            }
            if (customRes && customRes.ok) {
              const customData = await customRes.json();
              if (Array.isArray(customData.posts)) setCustomPosts(customData.posts);
            }
          });
        });
      }
    };
    window.addEventListener('ues-refresh-posts', handler);
    return () => window.removeEventListener('ues-refresh-posts', handler);
  }, []);

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
  };
}
