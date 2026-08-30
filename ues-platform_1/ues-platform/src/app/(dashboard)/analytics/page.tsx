"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PlatformTrendChart,
  ScoreBandChart,
  PlatformPieChart,
} from "@/components/charts/Charts";
import YouTubeAnalyticsDashboard from "@/components/dashboard/YouTubeAnalyticsDashboard";
import { TopPostsWidget } from "@/components/dashboard/TopPostsWidget";
import { GlobalOverviewWidget } from "@/components/dashboard/GlobalOverviewWidget";
import { PlatformPerformanceCards } from "@/components/dashboard/PlatformPerformanceCards";
import { PerformanceScoreWidget } from "@/components/dashboard/PerformanceScoreWidget";
import { CrossPlatformComparison } from "@/components/dashboard/CrossPlatformComparison";
import { AIPostAnalysisWidget } from "@/components/dashboard/AIPostAnalysisWidget";
import { AIInsightsSection } from "@/components/dashboard/AIInsightsSection";
import { auth } from "@/lib/firebase";

const TABS = ["Overview", "AI Analysis", "Trends", "Comparison", "Benchmark"];

// Client-side cache to persist analytics data across page navigation
const globalAnalyticsCacheMap = new Map<number, any>();

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [data, setData] = useState<any>(() => globalAnalyticsCacheMap.get(30) || null);
  const [loading, setLoading] = useState(() => !globalAnalyticsCacheMap.has(30));
  const [error, setError] = useState<string | null>(null);

  // Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const [reportProgressText, setReportProgressText] = useState("");
  const [reportContent, setReportContent] = useState("");

  const handleGenerateReport = async () => {
    setReportModalOpen(true);
    setReportLoading(true);
    setReportProgress(0);
    setReportProgressText("Aggregating cross-platform data...");

    const interval = setInterval(() => {
      setReportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next < 35) {
          setReportProgressText("Reading platform connections...");
        } else if (next < 70) {
          setReportProgressText("Evaluating real-time post metrics...");
        } else {
          setReportProgressText("Formulating multi-page AI diagnostic report...");
        }
        return next;
      });
    }, 400);

    try {
      let token = "";
      const user = auth.currentUser;
      if (user) {
        token = await user.getIdToken();
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isReport: true }),
      });

      if (!res.ok) throw new Error("Unable to generate the report.");

      const reportData = await res.json();
      clearInterval(interval);
      setReportProgress(100);
      setReportProgressText("Report generated successfully!");
      setReportContent(reportData.response);
      setReportLoading(false);
    } catch (err: any) {
      clearInterval(interval);
      setReportContent(`⚠️ **Error generating report:** ${err.message}`);
      setReportLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!reportContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download the PDF report.");
      return;
    }

    const pages = reportContent.split("<!-- PAGE_BREAK -->").filter(Boolean);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>UES Platform - Executive Social Media Intelligence Report</title>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              background: #0B191E;
              color: #F7FFF7;
              line-height: 1.6;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              padding: 40px;
              min-height: 100vh;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border-bottom: 2px dashed rgba(78, 205, 196, 0.2);
            }
            @media print {
              .page {
                page-break-after: always;
                border-bottom: none;
                padding: 30px;
              }
              body {
                background: #0B191E !important;
                color: #F7FFF7 !important;
              }
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid rgba(78, 205, 196, 0.3);
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .logo {
              font-size: 20px;
              font-weight: 800;
              color: #4ECDC4;
              letter-spacing: -0.5px;
            }
            .date {
              font-size: 11px;
              color: #A3C9C7;
              font-family: 'JetBrains Mono', monospace;
            }
            h1 {
              font-size: 22px;
              font-weight: 800;
              color: #4ECDC4;
              margin-bottom: 16px;
              letter-spacing: -0.5px;
            }
            h3 {
              font-size: 14px;
              font-weight: 700;
              color: #FF6B6B;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 18px;
              margin-bottom: 8px;
            }
            p, li {
              font-size: 13px;
              color: rgba(247, 255, 247, 0.9);
              margin-bottom: 8px;
            }
            ul {
              margin-left: 20px;
              margin-bottom: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;
              font-size: 12px;
              background: rgba(26, 77, 74, 0.25);
              border-radius: 8px;
              overflow: hidden;
              border: 1px solid rgba(78, 205, 196, 0.2);
            }
            th, td {
              padding: 10px 14px;
              text-align: left;
              border-bottom: 1px solid rgba(78, 205, 196, 0.15);
            }
            th {
              background: rgba(26, 77, 74, 0.6);
              color: #4ECDC4;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            strong {
              color: #FFFFFF;
              font-weight: 700;
            }
            .footer {
              margin-top: auto;
              padding-top: 16px;
              border-top: 1px solid rgba(78, 205, 196, 0.15);
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #A3C9C7;
              font-family: 'JetBrains Mono', monospace;
            }
          </style>
        </head>
        <body>
          ${pages
            .map(
              (pageText, index) => `
            <div class="page">
              <div>
                <div class="header">
                  <div class="logo">⚡ UES Analytics Intelligence</div>
                  <div class="date">GENERATED: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
                ${pageText
                  .replace(/# (.*?)\n/g, "<h1>$1</h1>")
                  .replace(/### (.*?)\n/g, "<h3>$1</h3>")
                  .replace(/\* (.*?)\n/g, "<li>$1</li>")
                  .replace(/\| (.*?) \|/g, "<tr><td>$1</td></tr>")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}
              </div>
              <div class="footer">
                <span>CONFIDENTIAL & PROPRIETARY — UES ENGAGEMENT PLATFORM</span>
                <span>PAGE ${index + 1} OF ${pages.length}</span>
              </div>
            </div>
          `
            )
            .join("")}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      if (!globalAnalyticsCacheMap.has(daysFilter)) {
        setLoading(true);
      }
      try {
        const user = auth.currentUser;
        let token = "";
        if (user) {
          try {
            token = await user.getIdToken();
          } catch {}
        }
        const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/analytics?days=${daysFilter}`, { headers });
        if (!res.ok) {
          throw new Error("Unable to fetch analytics reports");
        }
        const payload = await res.json();
        if (active) {
          globalAnalyticsCacheMap.set(daysFilter, payload);
          setData(payload);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load analytics");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      fetchAnalytics();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [daysFilter]);

  if (loading) {
    return (
      <div className="page-enter">
        <PageHeader
          title="Analytics & AI Insights"
          subtitle="Loading your performance metrics..."
        />
        <div className="px-9 pb-9">
          <div className="flex items-center gap-3 text-sm text-mint-700">
            <div className="w-4 h-4 border-2 border-cyan-ues border-t-transparent rounded-full animate-spin" />
            Loading analytics dashboard data...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-enter">
        <PageHeader
          title="Analytics & AI Insights"
          subtitle="Deep-dive into your cross-platform performance"
        />
        <div className="px-9 pb-9">
          <Card className="border border-pink-ues/20 bg-pink-ues/[0.03] p-6 text-center">
            <p className="text-pink-ues font-medium">⚠️ Error loading analytics reports</p>
            <p className="text-sm text-mint-700 mt-2">{error || "Connection failure"}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Analytics & AI Insights"
        subtitle="Deep-dive into your cross-platform performance with AI analysis"
        action={
          <div className="flex items-center gap-3">
            <select 
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="ues-select text-sm py-2 px-4 rounded-xl border border-cyan-border/20 text-mint-400 bg-[#071113] cursor-pointer outline-none focus:border-cyan-ues"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
            <Button variant="pink" size="sm" onClick={handleGenerateReport}>
              ⬇ Export Report
            </Button>
          </div>
        }
      />

      <div className="px-9 pb-9 space-y-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-teal-surface rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-cyan-mid text-cyan-ues"
                  : "text-mint-700 hover:text-[var(--color-mint)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        {activeTab === "Overview" && (
          <div className="space-y-8">
            <section>
              <GlobalOverviewWidget overview={data.overview} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <PerformanceScoreWidget 
                  score={data.globalUes.score}
                  grade={data.globalUes.grade}
                  trend={data.globalUes.trend}
                  percentile={data.globalUes.industryPercentile}
                />
              </div>
              <div className="lg:col-span-2">
                <CrossPlatformComparison data={data.crossPlatformComparison} />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-[var(--color-mint)]">Platform Breakdown</h3>
              </div>
              <PlatformPerformanceCards breakdown={data.platformBreakdown} />
            </section>
          </div>
        )}

        {activeTab === "AI Analysis" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <AIPostAnalysisWidget posts={data.aiAnalyzedPosts} />
            <AIInsightsSection insights={data.aiInsights} />
          </section>
        )}

        {activeTab === "Trends" && (
          <div className="space-y-8">
            <YouTubeAnalyticsDashboard />

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardTitle>Platform Engagement Trends</CardTitle>
                <CardSubtitle>Daily UES per platform · Last 14 days</CardSubtitle>
                <div className="mt-5">
                  <PlatformTrendChart />
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {[
                    { label: "Instagram", color: "#FF6B6B" },
                    { label: "YouTube", color: "#4ECDC4" },
                    { label: "Facebook", color: "#1877F2" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span className="text-xs text-mint-700">{l.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardTitle>Platform Content Split</CardTitle>
                <CardSubtitle>Post volume by platform</CardSubtitle>
                <div className="flex items-center gap-6 mt-2">
                  <div className="flex-shrink-0">
                    <PlatformPieChart />
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    {Object.values(data.platformBreakdown).map((p: any) => {
                      const percentage = data.overview.totalPosts > 0 ? Math.round((p.totalPosts / data.overview.totalPosts) * 100) : 0;
                      const color = p.platformId === 'instagram' ? '#FF6B6B' : p.platformId === 'youtube' ? '#4ECDC4' : '#1877F2';
                      return (
                        <div key={p.platformId}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-mint-700">{p.platformName}</span>
                            <span className="font-display font-bold" style={{ color }}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="h-2 bg-mint-50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}

        {activeTab === "Comparison" && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardTitle>Score Distribution</CardTitle>
              <CardSubtitle>Posts by UES band · Selected range</CardSubtitle>
              <div className="mt-5">
                <ScoreBandChart data={data.scoreDistribution} />
              </div>
            </Card>

            <TopPostsWidget posts={data.topPerformingPosts} />
          </section>
        )}

        {activeTab === "Benchmark" && (
          <Card className="p-8 text-center bg-teal-surface/30">
            <span className="text-4xl mb-4 block">📊</span>
            <CardTitle>Industry Benchmarks</CardTitle>
            <p className="text-sm text-mint-700 mt-2">
              Industry benchmark unavailable
            </p>
          </Card>
        )}
      </div>

      {/* REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <Card className="w-full max-w-2xl border-cyan-border/40 shadow-cyan-glow bg-teal-deep max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-cyan-border/15 flex justify-between items-center bg-teal-dark">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✨</span> Executive Performance Report
              </CardTitle>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-mint-700 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {reportLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="relative w-20 h-20">
                    <span className="absolute inset-0 rounded-full border-4 border-cyan-border animate-ping opacity-30" />
                    <span className="absolute inset-0 rounded-full border-4 border-cyan-ues border-t-transparent animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">📈</span>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold text-mint">{reportProgressText}</p>
                    <div className="w-64 h-2 bg-teal-surface rounded-full overflow-hidden border border-cyan-border/10">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-ues to-pink-ues transition-all duration-300"
                        style={{ width: `${reportProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-mint-700">{reportProgress}% Complete</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 prose-invert whitespace-pre-wrap text-sm text-mint-200">{reportContent}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-cyan-border/15 bg-teal-dark flex justify-end gap-3">
              {!reportLoading && (
                <>
                  <Button variant="pink" size="sm" onClick={handleDownloadPdf}>
                    📥 Download Multi-Page PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(reportContent);
                      alert("Report copied to clipboard!");
                    }}
                  >
                    Copy Report
                  </Button>
                </>
              )}
              <Button variant="primary" size="sm" onClick={() => setReportModalOpen(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
