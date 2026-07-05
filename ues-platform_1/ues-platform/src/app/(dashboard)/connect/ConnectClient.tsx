"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectedBadge } from "@/components/ui/Badge";
import { auth } from "@/lib/firebase";
import type { Platform } from "@/types";

export default function ConnectClient({ platforms }: { platforms: Platform[] }) {
  const [connections, setConnections] = useState<Record<string, any>>({});
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState<Record<string, boolean>>({});
  const [pendingConnected, setPendingConnected] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const loadConnections = React.useCallback(
    async (u: any) => {
      if (!u) return;
      setError(null);
      setLoadingConnections(true);

      const tryFetch = async (useFreshToken = false) => {
        const token = await u.getIdToken(useFreshToken);
        return fetch("/api/connections", { headers: { authorization: `Bearer ${token}` } });
      };

      try {
        let res = await tryFetch(true);
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
      }
    },
    [router]
  );

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        loadConnections(u);
      } else {
        setConnections({});
      }
    });

    loadConnections(auth.currentUser);
    return () => unsubscribe();
  }, [loadConnections]);

  useEffect(() => {
    if (searchParams.get("success") === "connected") {
      setPendingConnected(true);
      setError(null);
      if (user) {
        loadConnections(user);
      }
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
  const oauthError = searchParams.get("error");
  const oauthErrorReason = searchParams.get("reason");
  const showErrorMessage = oauthError
    ? `${oauthError.replace(/_/g, " ")}${oauthErrorReason ? `: ${decodeURIComponent(oauthErrorReason)}` : ""}`
    : error;

  return (
    <>
      {successConnected ? (
        <div className="p-4 mb-5 rounded-2xl bg-cyan-light border border-cyan-border/20 text-sm text-cyan-ues">
          YouTube access was granted successfully. Your connection is now active.
        </div>
      ) : null}
      {showErrorMessage && hasLoadedConnections && !pendingConnected ? (
        <div className="p-4 mb-5 rounded-2xl bg-pink-light border border-pink-ues/20 text-sm text-pink-ues">
          {showErrorMessage}
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {platforms.map((platform) => {
          const connected =
            !!connections[platform.id]?.connected ||
            (successConnected && platform.id === "youtube");
          const isLoading = !!loadingPlatform[platform.id];
          return (
            <Card
              key={platform.id}
              className={connected ? "border-cyan-border/35 bg-cyan-light/[0.04]" : ""}
            >
              <div className="text-4xl mb-3">{platform.icon}</div>
              <h3 className="font-display font-bold text-base mb-2">{platform.name}</h3>
              <p className="text-sm text-mint-700 mb-5 leading-relaxed min-h-[44px]">{PLATFORM_DESC[platform.id]}</p>
              {connected ? (
                <button disabled className="btn w-full bg-slate-300 text-slate-800 cursor-not-allowed">
                  Connected
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
    </>
  );
}
