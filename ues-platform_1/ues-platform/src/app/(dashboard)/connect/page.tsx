import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConnectedBadge } from "@/components/ui/Badge";
import { PLATFORMS } from "@/lib/data";

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
  return (
    <div className="page-enter">
      <PageHeader
        title="Connect Platform"
        subtitle="Authorize UES Platform to collect your engagement data"
      />
      <div className="px-9 pb-9">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {PLATFORMS.map((platform) => (
            <Card
              key={platform.id}
              className={platform.connected ? "border-cyan-border/35 bg-cyan-light/[0.04]" : ""}
            >
              <div className="text-4xl mb-3">{platform.icon}</div>
              <h3 className="font-display font-bold text-base mb-2">{platform.name}</h3>
              <p className="text-sm text-mint-700 mb-5 leading-relaxed min-h-[44px]">
                {PLATFORM_DESC[platform.id]}
              </p>
              {platform.connected ? (
                <ConnectedBadge />
              ) : (
                <Button variant="outline" size="sm" className="w-full">
                  Connect →
                </Button>
              )}
            </Card>
          ))}
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
