import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CONNECTED_PLATFORMS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Home — Unified Engagement Scoring",
};

const FEATURES = [
  { icon: "⚖️", bg: "bg-cyan-mid", title: "Metric Normalization", body: "Configurable per-platform weights remove scale bias — a YouTube view and an Instagram like are finally comparable." },
  { icon: "🤖", bg: "bg-pink-light", title: "AI Analyst Layer", body: "LLM-powered analyst explains score changes, identifies key drivers, and predicts engagement ranges in plain English." },
  { icon: "📊", bg: "bg-teal-surface border border-cyan-border/20", title: "Cross-Platform Dashboard", body: "Compare campaigns, posts, and creators side-by-side across Instagram, YouTube, X, LinkedIn, and more." },
  { icon: "🔒", bg: "bg-pink-light", title: "Secure & Multi-Tenant", body: "JWT auth, role-based access, and encrypted credentials. Enterprise-ready on Docker + AWS/GCP." },
  { icon: "⚡", bg: "bg-cyan-mid", title: "Real-Time Scoring", body: "Redis-powered caching serves computed UES scores in milliseconds. No waiting for batch jobs." },
  { icon: "📈", bg: "bg-teal-surface border border-cyan-border/20", title: "Trend Prediction", body: "Statistical ML models detect engagement trends and forecast score ranges before your competitors notice." },
];

export default function HomePage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className="relative min-h-[calc(100vh-68px)] flex flex-col items-center justify-center text-center px-[6vw] py-24 overflow-hidden bg-hero-glow">
        {/* Background blur orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[600px] h-[600px] rounded-full top-[-100px] left-1/2 -translate-x-1/2 bg-cyan-ues/[0.04] blur-3xl" />
          <div className="absolute w-[300px] h-[300px] rounded-full bottom-20 right-[10%] bg-pink-ues/[0.06] blur-3xl" />
        </div>

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 bg-cyan-light border border-cyan-border rounded-full px-4 py-1.5 text-xs font-semibold text-cyan-ues uppercase tracking-widest mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-ues animate-pulse-dot" />
          Cross-Platform Analytics
        </div>

        <h1 className="font-display font-extrabold text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.07] tracking-[-0.03em] max-w-[820px] mb-6">
          One{" "}
          <span className="text-cyan-ues">Unified Score</span>{" "}
          for All Your{" "}
          <span className="text-pink-ues">Social</span>{" "}
          Platforms
        </h1>
        <p className="text-[clamp(1rem,1.5vw,1.15rem)] text-mint-700 leading-relaxed max-w-[560px] mb-10">
          Stop comparing apples to oranges. UES Platform normalizes engagement metrics across Instagram, YouTube, X, and more — giving you one trustworthy score.
        </p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link href="/signup">
            <Button variant="primary" size="lg">Start Free Trial →</Button>
          </Link>
          <Link href="/features">
            <Button variant="ghost" size="lg">See How It Works</Button>
          </Link>
        </div>

        {/* Hero Score Visual */}
        <div className="relative mt-16 w-full max-w-[780px]">
          <div className="absolute -top-4 right-6 bg-pink-ues text-white font-display font-bold text-sm px-4 py-1.5 rounded-full shadow-pink-glow z-10">
            UES: 84.2
          </div>
          <div className="bg-teal-card/60 border border-cyan-border/20 rounded-[20px] p-7 backdrop-blur-xl grid grid-cols-4 gap-5">
            {CONNECTED_PLATFORMS.map((p) => {
              const score = p.uesScore ?? 0;
              const color =
                p.id === "instagram" ? "#FF6B6B"
                  : p.id === "youtube" ? "#4ECDC4"
                  : p.id === "twitter" ? "rgba(247,255,247,0.7)"
                  : "rgba(78,205,196,0.7)";
              return (
                <div
                  key={p.id}
                  className="bg-teal-surface/60 border border-cyan-border/10 rounded-xl p-4 text-center hover:-translate-y-1 transition-transform duration-200"
                >
                  <div className="text-3xl mb-2">{p.icon}</div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-mint-700 mb-3">{p.name}</p>
                  <div className="h-1.5 bg-mint-50 rounded-full mb-2.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                  </div>
                  <span className="font-display font-bold text-2xl" style={{ color }}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 px-[6vw] bg-teal-card/20">
        <div className="text-center mb-14">
          <p className="section-label">Why UES Platform</p>
          <h2 className="font-display font-extrabold text-[clamp(1.8rem,3.5vw,2.8rem)] tracking-tight leading-tight">
            Built for real analytics teams
          </h2>
          <p className="text-mint-700 mt-3 max-w-lg mx-auto leading-relaxed">
            Every feature is designed with one goal: trustworthy, comparable engagement data across every platform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <Card key={f.title} hover gradient>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${f.bg}`}>
                {f.icon}
              </div>
              <h3 className="font-display font-bold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-mint-700 leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
