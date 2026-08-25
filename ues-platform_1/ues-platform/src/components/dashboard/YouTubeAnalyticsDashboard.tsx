"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auth } from "@/lib/firebase";

interface YouTubeAnalyticsData {
  connected: boolean;
  period: { startDate: string; endDate: string };
  totals: {
    views: number;
    estimatedMinutesWatched: number;
    subscribersGained: number;
    likes: number;
  };
  trend: Array<{
    date: string;
    views: number;
    estimatedMinutesWatched: number;
    subscribersGained: number;
    likes: number;
  }>;
  generatedAt?: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 9999 ? "compact" : "standard" }).format(value);
}

export default function YouTubeAnalyticsDashboard() {
  const [data, setData] = useState<YouTubeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [channelName, setChannelName] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          if (active) {
            setData(null);
            setLoading(false);
          }
          return;
        }

        const token = await user.getIdToken();
        const [analyticsRes, connectionsRes] = await Promise.all([
          fetch("/api/connections/youtube/analytics", {
            headers: { authorization: `Bearer ${token}` },
          }),
          fetch("/api/connections", {
            headers: { authorization: `Bearer ${token}` },
          }),
        ]);

        if (!analyticsRes.ok) {
          throw new Error("Unable to load YouTube analytics.");
        }

        const payload = await analyticsRes.json();
        let nextChannelName: string | null = null;

        if (connectionsRes.ok) {
          const connections = await connectionsRes.json();
          const youtubeConnection = Array.isArray(connections)
            ? connections.find((connection: any) => connection.platformId === "youtube")
            : null;
          nextChannelName = youtubeConnection?.accountName || youtubeConnection?.channelTitle || youtubeConnection?.channelId || null;
        }

        if (active) {
          setData(payload);
          setChannelName(nextChannelName);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const statCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Views", value: formatNumber(data.totals.views), change: "Total views this period" },
      { label: "Watch time", value: formatNumber(data.totals.estimatedMinutesWatched), change: "Total minutes watched" },
      { label: "Subscribers", value: formatNumber(data.totals.subscribersGained), change: "Total subscribers gained" },
      { label: "Likes", value: formatNumber(data.totals.likes), change: "Total likes received" },
    ];
  }, [data]);

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle>YouTube Channel Analytics</CardTitle>
        <CardSubtitle>Loading your latest 30-day performance…</CardSubtitle>
      </Card>
    );
  }

  if (!data?.connected || error) {
    return (
      <Card className="p-6">
        <CardTitle>YouTube Channel Analytics</CardTitle>
        <CardSubtitle>Connect your YouTube channel to unlock this dashboard.</CardSubtitle>
        <p className="mt-4 text-sm text-mint-700">{error ?? "No analytics available yet."}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>YouTube Channel Analytics</CardTitle>
          <CardSubtitle>
            {channelName ? `Connected to ${channelName} • ` : ""}Last 30 days • {data.period.startDate} → {data.period.endDate}
          </CardSubtitle>
        </div>
        <div className="rounded-full border border-cyan-border/30 bg-cyan-light/[0.05] px-3 py-1 text-xs font-semibold text-cyan-ues">
          Live from YouTube Analytics API
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-cyan-border/15 bg-teal-surface p-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-mint-700">{stat.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--color-mint)]">{stat.value}</p>
            <p className="mt-2 text-xs text-cyan-ues">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.trend}>
            <defs>
              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ECDC4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#8AA8A0", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8AA8A0", fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="views" stroke="#4ECDC4" fill="url(#viewsGradient)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
