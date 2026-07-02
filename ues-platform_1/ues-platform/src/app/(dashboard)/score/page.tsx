import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { UESRing } from "@/components/ui/UESRing";
import { PlatformScoreRow } from "@/components/dashboard/PlatformScoreRow";
import { PlatformBarChart } from "@/components/charts/Charts";
import { UES_SCORE, CONNECTED_PLATFORMS } from "@/lib/data";

export const metadata: Metadata = { title: "Engagement Score" };

const COMPONENTS = [
  { key: "normalizedReach", label: "Normalized Reach", color: "#4ECDC4" },
  { key: "interactionDepth", label: "Interaction Depth", color: "#FF6B6B" },
  { key: "amplification", label: "Amplification", color: "rgba(247,255,247,0.8)" },
  { key: "retentionSignal", label: "Retention Signal", color: "rgba(78,205,196,0.65)" },
] as const;

const GRADE_COLORS: Record<string, string> = {
  "A+": "#4ECDC4", A: "#4ECDC4", "B+": "rgba(78,205,196,0.7)", B: "rgba(247,255,247,0.7)", C: "#FF6B6B", D: "#FF6B6B",
};

export default function ScorePage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Engagement Score"
        subtitle="Your Unified Engagement Score breakdown"
        action={
          <select className="ues-select text-sm py-2">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Last 90 Days</option>
          </select>
        }
      />

      <div className="px-9 pb-9 space-y-6">
        {/* Top row */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Big UES card */}
          <Card className="bg-score-gradient border-cyan-border/25 text-center flex flex-col items-center justify-center py-10">
            <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-5">
              Overall UES
            </p>
            <UESRing score={UES_SCORE.overall} size="lg" />
            <p className="text-mint-700 text-sm mt-4">Unified Engagement Score</p>
            <div
              className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full font-display font-bold text-lg"
              style={{
                background: "rgba(78,205,196,0.12)",
                color: GRADE_COLORS[UES_SCORE.grade],
              }}
            >
              Grade: {UES_SCORE.grade}
            </div>
            <p className="text-xs text-cyan-ues mt-3 font-medium">
              ↑ {UES_SCORE.trend}% from last period
            </p>
          </Card>

          {/* Score Components */}
          <Card>
            <CardTitle>Score Components</CardTitle>
            <CardSubtitle>How your UES is calculated from normalized sub-scores</CardSubtitle>
            <div className="grid grid-cols-2 gap-4 mt-5">
              {COMPONENTS.map((c) => {
                const val = UES_SCORE.components[c.key];
                return (
                  <div
                    key={c.key}
                    className="bg-teal-surface rounded-xl p-4 border border-cyan-border/8"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-2">
                      {c.label}
                    </p>
                    <p
                      className="font-display font-extrabold text-4xl mb-3 leading-none"
                      style={{ color: c.color }}
                    >
                      {val}
                    </p>
                    <div className="h-1.5 bg-mint-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${val}%`, background: c.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Platform comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardTitle>Platform UES Comparison</CardTitle>
            <CardSubtitle>Normalized scores across all connected platforms</CardSubtitle>
            <div className="mt-5">
              <PlatformBarChart />
            </div>
          </Card>

          <Card>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardSubtitle>Individual platform scores vs. your overall UES</CardSubtitle>
            <div className="mt-5 space-y-4">
              {CONNECTED_PLATFORMS.map((p) => (
                <PlatformScoreRow key={p.id} platform={p} />
              ))}
              <div className="pt-3 border-t border-cyan-border/10 flex items-center justify-between">
                <span className="text-sm text-mint-700">Overall UES</span>
                <span className="font-display font-extrabold text-lg text-cyan-ues">
                  {UES_SCORE.overall}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* UES methodology note */}
        <div className="p-5 bg-teal-surface border border-cyan-border/12 rounded-2xl flex items-start gap-4">
          <span className="text-xl flex-shrink-0">⚙️</span>
          <div>
            <p className="text-sm font-semibold mb-1">About UES Scoring Methodology</p>
            <p className="text-sm text-mint-700 leading-relaxed">
              The Unified Engagement Score is computed by a deterministic Python engine with no AI involvement — ensuring full transparency and reproducibility. Metrics are normalized using configurable per-platform weights, scaled to remove audience-size bias, then combined into a single 0–100 score. All computation is auditable and version-controlled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
