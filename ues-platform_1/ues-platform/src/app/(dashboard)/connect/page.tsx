import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectedBadge } from "@/components/ui/Badge";
import { PLATFORMS } from "@/lib/data";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export const metadata: Metadata = { title: "Connect Platform" };

const PLATFORM_DESC: Record<string, string> = {
  instagram: "Likes, comments, saves, reach, and story views normalized to UES.",
  youtube: "Views, likes, comments, watch time, and subscriber delta.",
  twitter: "Likes, retweets, replies, impressions, and profile clicks.",
  linkedin: "Reactions, comments, shares, impressions, and click-through.",
  tiktok: "Views, likes, comments, shares, and completion rate.",
  facebook: "Reactions, comments, shares, reach, and page engagement.",
};

export default function ConnectPage() {
  const [connections, setConnections] = useState<Record<string, any>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const user = auth.currentUser;
        const headers: Record<string, string> = {};
        if (user) {
          const token = await user.getIdToken();
          headers['authorization'] = `Bearer ${token}`;
        }
        const res = await fetch('/api/connections', { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        const map: Record<string, any> = {};
        data.forEach((c: any) => (map[c.platformId] = c));
        setConnections(map);
      } catch (e) {
        // ignore errors
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

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

  return (
    <div className="page-enter">
      <PageHeader
        title="Connect Platform"
        subtitle="Authorize UES Platform to collect your engagement data"
      />
      <div className="px-9 pb-9">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PLATFORMS.map((platform) => {
            const connected = !!connections[platform.id] || platform.connected;
            return (
              <Card
                key={platform.id}
                className={connected ? "border-cyan-border/35 bg-cyan-light/[0.04]" : ""}
              >
                <div className="text-4xl mb-3">{platform.icon}</div>
                <h3 className="font-display font-bold text-base mb-2">{platform.name}</h3>
                <p className="text-sm text-mint-700 mb-5 leading-relaxed min-h-[44px]">
                  {PLATFORM_DESC[platform.id]}
                </p>
                {connected ? (
                  <div className="flex items-center justify-between">
                    <ConnectedBadge />
                    <button onClick={() => handleDisconnect(platform.id)} className="btn btn-ghost">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <a className="btn w-full" href={`/api/connections/${platform.id}/start`}>
                    Connect →
                  </a>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info card */}
        <div className="mt-6 p-5 bg-cyan-light/[0.04] border border-cyan-border/20 rounded-2xl flex items-start gap-4">
          <span className="text-2xl flex-shrink-0 mt-0.5">ℹ️</span>
          <div>
            <p className="text-sm font-medium mb-1">How data collection works</p>
            <p className="text-sm text-mint-700 leading-relaxed">
              Raw engagement data is fetched via scheduled background jobs and stored unchanged for full traceability. Normalization and UES computation happen in a separate deterministic engine — ensuring scores are always reproducible and auditable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
