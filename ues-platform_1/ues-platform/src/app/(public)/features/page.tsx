import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Features" };

const FEATURES = [
  { icon: "🔗", bg: "bg-cyan-mid", title: "Platform Connectors", body: "One-click OAuth connections to Instagram, YouTube, X, LinkedIn, TikTok, and Facebook. Data ingested via scheduled background jobs with raw storage for full traceability." },
  { icon: "🧮", bg: "bg-pink-light", title: "Configurable Weights", body: "Assign custom importance weights to likes, comments, shares, views, and saves per platform. The UES Engine is fully transparent, deterministic, and auditable." },
  { icon: "📋", bg: "bg-teal-surface border border-cyan-border/20", title: "Post-Level Analysis", body: "Drill down to individual post scores. Compare top performers across platforms with a single unified metric that removes scale bias." },
  { icon: "💬", bg: "bg-cyan-mid", title: "AI Narrative Reports", body: "Ask the AI Analyst anything. Get executive-level explanations generated from your actual engagement data — not templates or generic summaries." },
  { icon: "👥", bg: "bg-pink-light", title: "Team Collaboration", body: "Multi-tenant org management with role-based access control. Share dashboards, reports, and insights with your entire team securely." },
  { icon: "🔔", bg: "bg-teal-surface border border-cyan-border/20", title: "Smart Alerts", body: "Get notified when a post's UES drops significantly or when a trend is detected. Stay ahead of your engagement curve with predictive signals." },
  { icon: "📦", bg: "bg-cyan-mid", title: "Data Export", body: "Export UES scores, raw metrics, and AI insights as CSV or JSON. Integrate with your existing BI tools and data pipelines seamlessly." },
  { icon: "🔐", bg: "bg-pink-light", title: "Enterprise Security", body: "JWT-based authentication, OAuth Google login, encrypted token storage, and API rate limiting. SOC 2-ready infrastructure." },
  { icon: "☁️", bg: "bg-teal-surface border border-cyan-border/20", title: "Cloud-Native Deployment", body: "Docker containers deployed on AWS, GCP, or Azure. GitHub Actions CI/CD pipeline with automated testing and zero-downtime deploys." },
];

export default function FeaturesPage() {
  return (
    <section className="min-h-[calc(100vh-68px)] py-20 px-[6vw]">
      <div className="mb-14">
        <p className="section-label">Features</p>
        <h1 className="font-display font-extrabold text-[clamp(2rem,4vw,3rem)] tracking-tight leading-tight mb-4">
          Everything you need to master<br />cross-platform engagement
        </h1>
        <p className="text-mint-700 max-w-xl leading-relaxed">
          From raw metric ingestion to AI-powered executive summaries — UES Platform covers the full analytics lifecycle.
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
  );
}
