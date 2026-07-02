import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "About" };

const STACK = [
  { label: "Next.js + TypeScript", role: "Frontend", color: "#4ECDC4" },
  { label: "Node.js + Fastify", role: "Backend API", color: "#FF6B6B" },
  { label: "Python + FastAPI", role: "UES Engine", color: "rgba(247,255,247,0.8)" },
  { label: "LLM + scikit-learn", role: "AI Analyst", color: "#4ECDC4" },
  { label: "PostgreSQL + Redis", role: "Database Layer", color: "rgba(78,205,196,0.7)" },
  { label: "Docker + AWS/GCP", role: "Deployment", color: "#FF6B6B" },
];

const RESEARCH_GAPS = [
  "Existing tools treat a YouTube view and Instagram like as equal — they're not.",
  "No standardized normalization layer exists across analytics platforms.",
  "Engagement rates are computed per-platform with no cross-platform benchmark.",
  "AI explanations are absent from most analytics tools — only raw numbers.",
];

export default function AboutPage() {
  return (
    <section className="min-h-[calc(100vh-68px)] py-20 px-[6vw]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left */}
        <div>
          <p className="section-label">About the Project</p>
          <h1 className="font-display font-extrabold text-[clamp(2rem,4vw,3rem)] tracking-tight leading-tight mb-5">
            Why we built<br />UES Platform
          </h1>
          <p className="text-mint-700 leading-relaxed mb-4">
            Every existing analytics tool treats a YouTube view and an Instagram like as equal. They're not. Platform behavior, audience size, and content type all affect what a metric means.
          </p>
          <p className="text-[var(--color-mint)] font-medium leading-relaxed mb-4">
            We built UES Platform to correct that bias.
          </p>
          <p className="text-mint-700 leading-relaxed mb-8">
            By applying configurable normalization weights and aggregating into a single Unified Engagement Score, brands, influencers, and campaigns finally have a fair, consistent benchmark across every platform.
          </p>

          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-pink-ues font-semibold mb-4">Research Gaps We Solve</p>
            <div className="flex flex-col gap-3">
              {RESEARCH_GAPS.map((gap, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-cyan-ues mt-0.5 font-bold">✓</span>
                  <p className="text-sm text-mint-700 leading-relaxed">{gap}</p>
                </div>
              ))}
            </div>
          </div>

          <Link href="/signup">
            <Button variant="primary" size="lg">Join the Platform →</Button>
          </Link>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-[10px] uppercase tracking-[0.12em] text-mint-700 font-semibold mb-5">
              Tech Stack
            </p>
            <div className="flex flex-col gap-2.5">
              {STACK.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 bg-teal-surface border border-cyan-border/8 rounded-xl px-4 py-3"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <span className="text-xs text-mint-700">{item.role}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-score-gradient border-cyan-border/25">
            <p className="text-xs text-mint-700 mb-2">Architecture Principle</p>
            <p className="font-display font-bold text-base mb-3">
              Deterministic scoring. Explainable AI.
            </p>
            <p className="text-sm text-mint-700 leading-relaxed">
              The UES Engine is a pure computation layer — no AI involved. AI is only used for interpretation and prediction, keeping the scoring transparent and auditable.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
