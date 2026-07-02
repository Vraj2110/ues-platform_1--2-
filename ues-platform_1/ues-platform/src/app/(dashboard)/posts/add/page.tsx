import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { METRIC_WEIGHTS } from "@/lib/data";

export const metadata: Metadata = { title: "Add Post" };

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

const TYPE_OPTIONS = [
  { value: "reel", label: "Reel / Short Video" },
  { value: "photo", label: "Static Post / Photo" },
  { value: "story", label: "Story" },
  { value: "video", label: "Long-form Video" },
  { value: "thread", label: "Thread" },
  { value: "article", label: "Article" },
];

export default function AddPostPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Add Post"
        subtitle="Manually log a post to compute its Unified Engagement Score"
        action={
          <Link href="/posts">
            <Button variant="ghost">← Back to Posts</Button>
          </Link>
        }
      />

      <div className="px-9 pb-9 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main form */}
        <Card>
          <CardTitle>Post Details</CardTitle>
          <CardSubtitle>Enter post information and raw engagement metrics</CardSubtitle>

          <div className="mt-6 space-y-5">
            {/* Platform & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-mint-700">Platform</label>
                <select className="ues-select">
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-mint-700">Post Type</label>
                <select className="ues-select">
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <Input
              label="Post Caption / Title"
              placeholder="What did you post about?"
              type="text"
            />

            {/* URL */}
            <Input
              label="Post URL (optional)"
              placeholder="https://instagram.com/p/..."
              type="url"
            />

            {/* Metrics section header */}
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-cyan-ues mb-4">
                Engagement Metrics
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Likes / Reactions" placeholder="0" type="number" min="0" />
                <Input label="Comments" placeholder="0" type="number" min="0" />
                <Input label="Shares / Retweets" placeholder="0" type="number" min="0" />
                <Input label="Views / Impressions" placeholder="0" type="number" min="0" />
                <Input label="Saves / Bookmarks" placeholder="0" type="number" min="0" />
                <Input label="Follower Count at Post Time" placeholder="0" type="number" min="0" />
              </div>
            </div>

            {/* Date */}
            <Input label="Published Date" type="date" />

            <Button variant="primary" size="lg" className="w-full mt-2">
              Calculate UES Score →
            </Button>
          </div>
        </Card>

        {/* Sidebar panels */}
        <div className="space-y-5">
          {/* Score Preview */}
          <Card className="text-center">
            <CardTitle>Score Preview</CardTitle>
            <CardSubtitle>Estimated UES after entry</CardSubtitle>
            <div className="py-8">
              <p className="font-display font-extrabold text-7xl text-cyan-ues/20 leading-none">
                —
              </p>
              <p className="text-xs text-mint-700 mt-3">Fill in metrics to preview</p>
            </div>
          </Card>

          {/* Metric Weights */}
          <Card>
            <CardTitle>Metric Weights</CardTitle>
            <CardSubtitle>Current normalization config</CardSubtitle>
            <div className="mt-4 space-y-3">
              {METRIC_WEIGHTS.map((w) => (
                <div key={w.metric} className="flex items-center justify-between">
                  <span className="text-sm text-mint-700">{w.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-mint-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-ues rounded-full"
                        style={{ width: `${w.weight * 100 * 5}%` }}
                      />
                    </div>
                    <span className="text-xs font-display font-bold text-cyan-ues w-10 text-right">
                      {w.weight.toFixed(2)}×
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 text-xs text-cyan-ues hover:underline">
              Customize weights →
            </button>
          </Card>

          {/* Tips */}
          <div className="p-4 bg-pink-light border border-pink-ues/15 rounded-2xl">
            <p className="text-xs font-semibold text-pink-ues mb-1.5">💡 Tip</p>
            <p className="text-xs text-mint-700 leading-relaxed">
              For most accurate scoring, enter follower count at the time of posting — not your current count. This ensures fair normalization across different posting periods.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
