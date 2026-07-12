import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge, ConnectedBadge } from "@/components/ui/Badge";
import { auth } from "@/lib/firebase";
import type { Platform } from "@/types";
import YouTubeVideoList from "@/components/dashboard/YouTubeVideoList";

export default function ConnectClient({ platforms }: { platforms: Platform[] }) {
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState<Record<string, boolean>>({});
  // Initialize loadingConnections to false. It will be set to true by loadConnections when a user is detected.
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [pendingConnected, setPendingConnected] = useState(false);
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const loadConnections = React.useCallback(
    async (u: any, useFreshToken = false) => {
      if (!u) return;
      setError(null);
      setLoadingConnections(true);

      const tryFetch = async (freshToken = false) => {
        const token = await u.getIdToken(freshToken);
        return fetch("/api/connections", { headers: { authorization: `Bearer ${token}` } });
      };

      try {
        let res = await tryFetch(useFreshToken);
        if (res.status === 401) {
          res = await tryFetch(true);
        }

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login");
          } else {
            setError("Unable to load your connected platforms. Please try again.");
          }
          return;
        }

        const data = await res.json();
        const map: Record<string, any> = {};
        data.forEach((c: any) => (map[c.platformId] = c));
        setConnections(map);
        setHasLoadedConnections(true);
      } catch (e) {
        console.error("Connection fetch error", e);
        setError("Unable to load your connected platforms. Please try again.");
      } finally {
        setLoadingConnections(false);
        // Do NOT reset pendingConnected here. It's managed by the searchParams useEffect.
      }
    },
    [router]
  );

  useEffect(() => {
    // The onAuthStateChanged listener fires immediately with the current user's state.
    // Therefore, an explicit `loadConnections(auth.currentUser)` outside the listener
    // is generally not needed and can lead to redundant fetches or race conditions.
    // The initial `useState(false)` for `loadingConnections` combined with the
    // `onAuthStateChanged` callback handles the initial load correctly.
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        // When a user is found (either initially or after sign-in), load their connections.
        // `setLoadingConnections(true)` is handled inside `loadConnections`.
        loadConnections(u);
      } else {
        // If no user, clear connections and stop loading
        setLoadingConnections(false);
        setConnections({});
        setHasLoadedConnections(true);
      }
    });

    return () => unsubscribe();
  }, [loadConnections]);

  useEffect(() => {
    const successParam = searchParams.get("success");
    const platformParam = searchParams.get("platform");
    const oauthErrorParam = searchParams.get("error");
    const oauthErrorReasonParam = searchParams.get("reason");

    // Flag to check if any relevant search params are present for cleanup
    let shouldClearSearchParams = false;

    if (successParam === "connected" && platformParam) {
      setPendingConnected(true);
      setError(null);

      if (user) {
        loadConnections(user, true);
      }

      const timer = window.setTimeout(() => {
        setPendingConnected(false);
      }, 3000);

      shouldClearSearchParams = true;
      return () => clearTimeout(timer);
    } else if (oauthErrorParam || oauthErrorReasonParam) {
      // If there's an OAuth error, display it
      const errorMessage = oauthErrorParam
        ? `${oauthErrorParam.replace(/_/g, " ")}${oauthErrorReasonParam ? `: ${decodeURIComponent(oauthErrorReasonParam)}` : ""}`
        : "An unknown OAuth error occurred.";
      setError(errorMessage);
      shouldClearSearchParams = true;
    }

    // Always clear the search params after processing to prevent re-triggering and clean URL
    if (shouldClearSearchParams) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete("success");
      newSearchParams.delete("platform");
      newSearchParams.delete("error");
      newSearchParams.delete("reason");

      router.replace(`${window.location.pathname}?${newSearchParams.toString()}`, { scroll: false });
    }
  }, [searchParams, user, loadConnections]);

  async function handleStart(platformId: string) {
    if (!user) {
      setError("Please sign in first to connect a platform.");
      router.push("/login");
      return;
    }

    setError(null);
    setLoadingPlatform((prev) => ({ ...prev, [platformId]: true }));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/connections/${platformId}/start`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const payload = await res.text();
        setError(payload || "Unable to start OAuth connection. Please try again.");
        return;
      }

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setError("Unexpected response from the server.");
      }
    } catch (e) {
      setError("Failed to start connection. Check your network and try again.");
    } finally {
      setLoadingPlatform((prev) => ({ ...prev, [platformId]: false }));
    }
  }

  async function handleDisconnect(platformId: string) {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`/api/connections/${platformId}/disconnect`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConnections((prev) => {
          const copy = { ...prev };
          delete copy[platformId];
          return copy;
        });
      }
    } catch (e) {
      // ignore
    }
  }

  const PLATFORM_DESC: Record<string, string> = {
    instagram: "Likes, comments, saves, reach, and story views normalized to UES.",
    youtube: "Views, likes, comments, watch time, and subscriber delta.",
    twitter: "Likes, retweets, replies, impressions, and profile clicks.",
    linkedin: "Reactions, comments, shares, impressions, and click-through.",
    tiktok: "Views, likes, comments, shares, and completion rate.",
    facebook: "Reactions, comments, shares, reach, and page engagement.",
  };

  const successConnected = searchParams.get("success") === "connected";
  const justConnectedPlatform = searchParams.get("platform");
  const oauthError = searchParams.get("error");
  const oauthErrorReason = searchParams.get("reason");
  const showErrorMessage = oauthError
    ? `${oauthError.replace(/_/g, " ")}${oauthErrorReason ? `: ${decodeURIComponent(oauthErrorReason)}` : ""}`
    : error;

  return (
    <>
      {successConnected && justConnectedPlatform ? (
        <div className="p-4 mb-5 rounded-2xl bg-cyan-light border border-cyan-border/20 text-sm text-cyan-ues">
          {justConnectedPlatform.charAt(0).toUpperCase() + justConnectedPlatform.slice(1)} access was granted successfully. Your connection is now active.
        </div>
      ) : null}
      {showErrorMessage && hasLoadedConnections && !pendingConnected && !loadingConnections ? (
        <div className="p-4 mb-5 rounded-2xl bg-pink-light border border-pink-ues/20 text-sm text-pink-ues">
          {showErrorMessage}
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {platforms.map((platform) => {
          const connected =
            !!connections[platform.id]?.connected ||
            (successConnected && justConnectedPlatform === platform.id);
          const isLoading = loadingConnections || !!loadingPlatform[platform.id];
          return (
            <Card
              key={platform.id}
              className={connected ? "border-cyan-border/35 bg-cyan-light/[0.04]" : ""}
            >
              <div className="text-4xl mb-3">{platform.icon}</div>
              <div className="flex items-center gap-2 mb-5">
                <h3 className="font-display font-bold text-base">{platform.name}</h3>
                {connected && platform.id === "youtube" && <ConnectedBadge />}
                {connected && platform.id !== "youtube" && (
                  <Badge variant="cyan" className="text-xs">
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-mint-700 mb-5 leading-relaxed min-h-[44px]">{PLATFORM_DESC[platform.id]}</p>
              {connected ? (
                <button
                  onClick={() => handleDisconnect(platform.id)}
                  className="btn w-full bg-pink-light text-pink-ues border border-pink-ues/30 hover:bg-pink-ues/10"
                  disabled={isLoading}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleStart(platform.id)}
                  className="btn w-full"
                  disabled={!user || isLoading}
                >
                  {isLoading ? "Connecting..." : user ? "Connect →" : "Sign in to connect"}
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* YouTube Content Section - Shows when YouTube is connected */}
      {(connections.youtube?.connected || (successConnected && justConnectedPlatform === "youtube")) && <YouTubeVideoList />}
    </>
  );
}
