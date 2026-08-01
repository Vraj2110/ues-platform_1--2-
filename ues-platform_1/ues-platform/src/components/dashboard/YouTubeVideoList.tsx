"use client";

import { useEffect, useState } from "react";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/Card";
import { auth } from "@/lib/firebase";

interface VideoItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
}

export default function YouTubeVideoList() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [channelName, setChannelName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "connected") {
        setRefreshKey((prev) => prev + 1);
      }
    }
  }, []);

  useEffect(() => {
    let canceled = false;

    const loadVideos = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Please sign in to see your YouTube videos.");
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const [videosRes, connectionsRes] = await Promise.all([
          fetch("/api/connections/youtube/videos", {
            headers: { authorization: `Bearer ${token}` },
          }),
          fetch("/api/connections", {
            headers: { authorization: `Bearer ${token}` },
          }),
        ]);

        if (!videosRes.ok) {
          const payload = await videosRes.json();
          throw new Error(payload.error || "Unable to load videos.");
        }

        const data = await videosRes.json();
        let nextChannelName: string | null = null;

        if (connectionsRes.ok) {
          const connections = await connectionsRes.json();
          const youtubeConnection = Array.isArray(connections)
            ? connections.find((connection: any) => connection.platformId === "youtube")
            : null;
          nextChannelName = youtubeConnection?.accountName || youtubeConnection?.channelTitle || youtubeConnection?.channelId || null;
        }

        if (!canceled) {
          setVideos(data.videos || []);
          setChannelName(nextChannelName);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load videos.");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadVideos();
    return () => {
      canceled = true;
    };
  }, [refreshKey]);

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>YouTube Uploads</CardTitle>
          <CardSubtitle>
            {channelName ? `Latest uploaded videos from ${channelName}` : "Latest uploaded videos from your connected channel"}
          </CardSubtitle>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-mint-700">Loading videos…</p>
      ) : error ? (
        <p className="mt-5 text-sm text-pink-ues">{error}</p>
      ) : videos.length === 0 ? (
        <p className="mt-5 text-sm text-mint-700">No recent videos found.</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {videos.map((video) => (
            <a
              key={video.id}
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noreferrer"
              className="group rounded-3xl border border-cyan-border/15 overflow-hidden bg-teal-surface transition-shadow hover:shadow-lg flex flex-col justify-between"
            >
              <div className="relative h-40 w-full bg-teal-card/60 flex items-center justify-center overflow-hidden">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-4xl">▶️</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-mint-900 group-hover:text-cyan-ues line-clamp-2">
                  {video.title}
                </h3>
                <p className="mt-2 text-xs text-mint-700">
                  {new Date(video.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
