import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AIInsightCard } from "@/components/dashboard/AIInsightCard";
import { AI_INSIGHTS } from "@/lib/data";

export const metadata: Metadata = { title: "AI Insights" };

const SUGGESTION_CHIPS = [
  "Why did my Instagram score drop?",
  "Which platform should I focus on?",
  "Predict my score next week",
  "What content type performs best?",
];

export default function InsightsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="AI Insights"
        subtitle="LLM-powered analysis of your engagement data"
        action={
          <Button variant="pink" size="sm">
            ✨ Generate Report
          </Button>
        }
      />

      <div className="px-9 pb-9 space-y-6">
        {/* AI Prompt Area */}
        <Card className="bg-score-gradient border-cyan-border/25">
          <CardTitle>Ask the AI Analyst</CardTitle>
          <CardSubtitle>
            Ask anything about your engagement data — score changes, platform comparisons, predictions
          </CardSubtitle>
          <div className="mt-5 flex gap-3">
            <input
              type="text"
              placeholder="e.g. Why did my Instagram score drop last week?"
              className="ues-input flex-1"
            />
            <Button variant="primary">Ask →</Button>
          </div>
          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                className="px-3 py-1.5 rounded-lg bg-teal-surface border border-cyan-border/15 text-xs text-mint-700 hover:border-cyan-ues hover:text-cyan-ues transition-all duration-200"
              >
                {chip}
              </button>
            ))}
          </div>
        </Card>

        {/* Model info strip */}
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-surface border border-cyan-border/10 rounded-xl">
          <span className="text-lg">🤖</span>
          <div className="flex-1">
            <p className="text-xs font-medium">
              Powered by <span className="text-cyan-ues">LLM API</span> + <span className="text-cyan-ues">scikit-learn</span>
            </p>
            <p className="text-[11px] text-mint-700 mt-0.5">
              AI interprets computed scores — scoring itself remains deterministic and AI-free
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-ues font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-pulse-dot" />
            Online
          </div>
        </div>

        {/* Insights list */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-4">
            Latest Insights
          </p>
          <div className="space-y-4">
            {AI_INSIGHTS.map((insight) => (
              <AIInsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>

        {/* Prediction card */}
        <Card className="border-cyan-border/20 bg-teal-card/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-mid flex items-center justify-center text-2xl flex-shrink-0">
              📊
            </div>
            <div className="flex-1">
              <CardTitle>7-Day Score Forecast</CardTitle>
              <CardSubtitle>
                Based on historical trends, posting cadence, and platform activity
              </CardSubtitle>
              <div className="mt-4 flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-mint-700 mb-1">Current</p>
                  <p className="font-display font-extrabold text-3xl text-cyan-ues">84</p>
                </div>
                <div className="flex-1 h-1.5 bg-mint-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-ues to-[#5de0d7]"
                    style={{ width: "84%" }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-widest text-mint-700 mb-1">Forecast</p>
                  <p className="font-display font-extrabold text-3xl text-cyan-ues">87–90</p>
                </div>
              </div>
              <p className="text-xs text-mint-700 mt-3">
                Requires ≥3 Instagram posts + 1 YouTube video this week for upper range
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
