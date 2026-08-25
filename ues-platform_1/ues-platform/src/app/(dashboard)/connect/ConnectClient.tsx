"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge, ConnectedBadge } from "@/components/ui/Badge";
import { auth } from "@/lib/firebase";
import type { Platform } from "@/types";

export default function ConnectClient({ platforms }: { platforms: Platform[] }) {
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState<Record<string, boolean>>({});
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [pendingConnected, setPendingConnected] = useState(false);
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const safePlatforms = Array.isArray(platforms) ? platforms : [];

  const loadConnections = React.useCallback(
    async (u: any) => {
      if (!u) return;
      setError(null);
      setLoadingConnections(true);

      try {
        const token = await u.getIdToken();
        const res = await fetch("/api/connections", { headers: { authorization: `Bearer ${token}` } });

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
        if (Array.isArray(data)) {
          data.forEach((c: any) => {
            if (c?.platformId) {
              map[c.platformId] = c;
            }
          });
        }
        setConnections(map);
        if (typeof window !== "undefined") {
          localStorage.setItem("ues_connections", JSON.stringify(map));
        }
        setHasLoadedConnections(true);
      } catch (e) {
        console.error("Connection fetch error", e);
        setError("Unable to load your connected platforms. Please try again.");
      } finally {
        setLoadingConnections(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ues_connections");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === "object") {
            setConnections(parsed);
          }
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    try {
      const unsubscribe = auth.onAuthStateChanged((u) => {
        setUser(u);
        if (u) {
          loadConnections(u);
        } else {
          setLoadingConnections(false);
          setConnections({});
          setHasLoadedConnections(true);
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Auth listener setup failed", e);
      setError("Unable to initialize the connection page.");
      return undefined;
    }
  }, [loadConnections]);

  const processedParamsRef = React.useRef<string | null>(null);

  useEffect(() => {
    try {
      const currentQuery = searchParams?.toString() || "";
      if (processedParamsRef.current === currentQuery) {
        return;
      }

      const successParam = searchParams?.get("success");
      const platformParam = searchParams?.get("platform");
      const oauthErrorParam = searchParams?.get("error");
      const oauthErrorReasonParam = searchParams?.get("reason");

      if (!successParam && !platformParam && !oauthErrorParam && !oauthErrorReasonParam) {
        processedParamsRef.current = currentQuery;
        return;
      }

      processedParamsRef.current = currentQuery;
      let shouldClearSearchParams = false;

      if (successParam === "connected" && platformParam) {
        const optimisticPlatformId = platformParam || "youtube";
        setPendingConnected(true);
        setError(null);
        setConnections((prev) => ({
          ...prev,
          [optimisticPlatformId]: {
            ...(prev[optimisticPlatformId] || {}),
            connected: true,
            platformId: optimisticPlatformId,
            accountName: prev[optimisticPlatformId]?.accountName || "Your connected channel",
            lastSync: new Date().toISOString(),
          },
        }));
        if (user) {
          loadConnections(user);
        }
        window.setTimeout(() => {
          setPendingConnected(false);
        }, 3000);
        shouldClearSearchParams = true;
      } else if (oauthErrorParam || oauthErrorReasonParam) {
        const errorMessage = oauthErrorParam
          ? `${oauthErrorParam.replace(/_/g, " ")}${oauthErrorReasonParam ? `: ${decodeURIComponent(oauthErrorReasonParam)}` : ""}`
          : "An unknown OAuth error occurred.";
        setError(errorMessage);
        shouldClearSearchParams = true;
      }

      if (shouldClearSearchParams && typeof window !== "undefined") {
        const newSearchParams = new URLSearchParams(searchParams?.toString() || "");
        newSearchParams.delete("success");
        newSearchParams.delete("platform");
        newSearchParams.delete("error");
        newSearchParams.delete("reason");

        const newPath = newSearchParams.toString()
          ? `${window.location.pathname}?${newSearchParams.toString()}`
          : window.location.pathname;

        router.replace(newPath, { scroll: false });
      }
    } catch (e) {
      console.error("Search params handling failed", e);
    }
  }, [searchParams, user, loadConnections, router]);

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
        if (typeof window !== "undefined") {
          window.location.assign(data.url);
        }
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
    threads: "Likes, replies, views, and reposts normalized to UES.",
    linkedin: "Reactions, comments, shares, impressions, and click-through.",
    tiktok: "Views, likes, comments, shares, and completion rate.",
    facebook: "Reactions, comments, shares, reach, and page engagement.",
  };

  const successConnected = searchParams?.get("success") === "connected";
  const justConnectedPlatform = searchParams?.get("platform");
  const oauthError = searchParams?.get("error");
  const oauthErrorReason = searchParams?.get("reason");
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
        {safePlatforms.map((platform) => {
          const connected =
            !!connections[platform.id]?.connected ||
            (successConnected && justConnectedPlatform === platform.id);
          const connection = connections[platform.id];
          const isLoading = loadingConnections || !!loadingPlatform[platform.id];
          return (
            <Card
              key={platform.id}
              className={connected ? "border-cyan-border/35 bg-cyan-light/[0.04]" : ""}
            >
              <div className="text-4xl mb-3">{platform.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-display font-bold text-base">{platform.name}</h3>
                {connected && platform.id === "youtube" && <ConnectedBadge />}
                {connected && platform.id !== "youtube" && (
                  <Badge variant="cyan" className="text-xs">
                    Connected
                  </Badge>
                )}
              </div>
              {connected ? (
                <div className="mb-4 rounded-xl border border-cyan-border/20 bg-cyan-light/[0.06] px-3 py-2 text-xs text-cyan-ues">
                  {connection?.accountName ? `Connected to ${connection.accountName}` : "Connected and ready for analysis"}
                </div>
              ) : null}
              <p className="text-sm text-mint-700 mb-5 leading-relaxed min-h-[44px]">{PLATFORM_DESC[platform.id]}</p>
              {connected ? (
                <div className="space-y-2">
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-mid/20 text-cyan-ues font-display font-semibold text-sm border border-cyan-border/40">
                    <span>✓ Connected</span>
                  </div>
                  <button
                    onClick={() => handleDisconnect(platform.id)}
                    className="text-xs text-mint-700 hover:text-pink-ues transition w-full text-center py-1 cursor-pointer"
                    disabled={isLoading}
                  >
                    Disconnect channel
                  </button>
                </div>
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
    </>
  );
}
