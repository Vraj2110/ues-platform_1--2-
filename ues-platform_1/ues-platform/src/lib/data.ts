import type {
  Platform,
  Post,
  UESScore,
  TimeSeriesDataPoint,
  AIInsight,
  DashboardStat,
  MetricWeight,
  ScoreBand,
  PlatformDistribution,
} from "@/types";

// ─── Platforms ─────────────────────────────────────────────────────────────

export const PLATFORMS: Platform[] = [
  { id: "instagram", name: "Instagram", icon: "📸", color: "#FF6B6B", connected: true, uesScore: 82 },
  { id: "youtube", name: "YouTube", icon: "▶️", color: "#4ECDC4", connected: true, uesScore: 91 },
  { id: "twitter", name: "X / Twitter", icon: "🐦", color: "#F7FFF7", connected: true, uesScore: 74 },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "#4ECDC4", connected: true, uesScore: 88 },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "#FF6B6B", connected: false },
  { id: "facebook", name: "Facebook", icon: "📘", color: "#4ECDC4", connected: false },
];

export const CONNECTED_PLATFORMS = PLATFORMS.filter((p) => p.connected);

// ─── Posts ─────────────────────────────────────────────────────────────────

export const POSTS: Post[] = [
  {
    id: "p1",
    platform: "instagram",
    title: "Behind the scenes — product launch day",
    type: "reel",
    status: "active",
    metrics: { likes: 4820, comments: 312, shares: 198, views: 48200, saves: 620, followerCount: 28400 },
    uesScore: 91,
    publishedAt: "2024-03-12",
  },
  {
    id: "p2",
    platform: "youtube",
    title: "How we built our analytics pipeline in 2024",
    type: "video",
    status: "active",
    metrics: { likes: 1840, comments: 247, shares: 92, views: 142000, saves: 0, followerCount: 18200 },
    uesScore: 87,
    publishedAt: "2024-03-11",
  },
  {
    id: "p3",
    platform: "twitter",
    title: "Hot take: engagement rate is a useless metric",
    type: "thread",
    status: "active",
    metrics: { likes: 2140, comments: 384, shares: 641, views: 89400, saves: 312, followerCount: 12600 },
    uesScore: 74,
    publishedAt: "2024-03-10",
  },
  {
    id: "p4",
    platform: "linkedin",
    title: "Why cross-platform analytics needs standardization",
    type: "article",
    status: "active",
    metrics: { likes: 824, comments: 142, shares: 217, views: 18400, saves: 98, followerCount: 6800 },
    uesScore: 83,
    publishedAt: "2024-03-09",
  },
  {
    id: "p5",
    platform: "instagram",
    title: "New feature drop — AI Analyst is now live!",
    type: "photo",
    status: "archived",
    metrics: { likes: 1240, comments: 88, shares: 34, views: 19200, saves: 142, followerCount: 28400 },
    uesScore: 68,
    publishedAt: "2024-03-07",
  },
  {
    id: "p6",
    platform: "youtube",
    title: "Full tutorial: Setting up your UES dashboard",
    type: "video",
    status: "active",
    metrics: { likes: 3120, comments: 514, shares: 184, views: 212000, saves: 0, followerCount: 18200 },
    uesScore: 95,
    publishedAt: "2024-03-05",
  },
];

// ─── UES Score ─────────────────────────────────────────────────────────────

export const UES_SCORE: UESScore = {
  overall: 84,
  grade: "A",
  components: {
    normalizedReach: 76,
    interactionDepth: 88,
    amplification: 82,
    retentionSignal: 79,
  },
  platformBreakdown: {
    instagram: 82,
    youtube: 91,
    twitter: 74,
    linkedin: 88,
    tiktok: 0,
    facebook: 0,
  },
  trend: 6.4,
};

// ─── Metric Weights ────────────────────────────────────────────────────────

export const METRIC_WEIGHTS: MetricWeight[] = [
  { metric: "likes", label: "Likes / Reactions", weight: 0.2 },
  { metric: "comments", label: "Comments", weight: 0.3 },
  { metric: "shares", label: "Shares / Retweets", weight: 0.25 },
  { metric: "views", label: "Views / Impressions", weight: 0.1 },
  { metric: "saves", label: "Saves / Bookmarks", weight: 0.15 },
];

// ─── Time Series ───────────────────────────────────────────────────────────

export const TIME_SERIES: TimeSeriesDataPoint[] = [
  { date: "Mar 1", ues: 76, instagram: 72, youtube: 80, twitter: 68, linkedin: 78 },
  { date: "Mar 2", ues: 74, instagram: 70, youtube: 78, twitter: 65, linkedin: 76 },
  { date: "Mar 3", ues: 79, instagram: 75, youtube: 84, twitter: 70, linkedin: 80 },
  { date: "Mar 4", ues: 77, instagram: 73, youtube: 82, twitter: 67, linkedin: 79 },
  { date: "Mar 5", ues: 82, instagram: 78, youtube: 90, twitter: 72, linkedin: 83 },
  { date: "Mar 6", ues: 80, instagram: 76, youtube: 88, twitter: 70, linkedin: 82 },
  { date: "Mar 7", ues: 78, instagram: 74, youtube: 85, twitter: 68, linkedin: 80 },
  { date: "Mar 8", ues: 81, instagram: 77, youtube: 87, twitter: 71, linkedin: 82 },
  { date: "Mar 9", ues: 83, instagram: 79, youtube: 89, twitter: 73, linkedin: 84 },
  { date: "Mar 10", ues: 80, instagram: 76, youtube: 86, twitter: 70, linkedin: 81 },
  { date: "Mar 11", ues: 85, instagram: 80, youtube: 92, twitter: 74, linkedin: 86 },
  { date: "Mar 12", ues: 83, instagram: 78, youtube: 90, twitter: 72, linkedin: 84 },
  { date: "Mar 13", ues: 87, instagram: 82, youtube: 93, twitter: 76, linkedin: 88 },
  { date: "Mar 14", ues: 84, instagram: 80, youtube: 91, twitter: 74, linkedin: 85 },
];

// ─── Platform Distribution ─────────────────────────────────────────────────

export const PLATFORM_DISTRIBUTION: PlatformDistribution[] = [
  { platform: "Instagram", count: 48, percentage: 38, color: "#FF6B6B" },
  { platform: "YouTube", count: 31, percentage: 24, color: "#4ECDC4" },
  { platform: "X / Twitter", count: 28, percentage: 22, color: "rgba(247,255,247,0.5)" },
  { platform: "LinkedIn", count: 20, percentage: 16, color: "rgba(78,205,196,0.6)" },
];

// ─── Score Bands ───────────────────────────────────────────────────────────

export const SCORE_BANDS: ScoreBand[] = [
  { range: "0–40", count: 4, fill: "rgba(255,107,107,0.6)" },
  { range: "40–55", count: 9, fill: "rgba(255,107,107,0.5)" },
  { range: "55–70", count: 18, fill: "rgba(78,205,196,0.5)" },
  { range: "70–85", count: 72, fill: "#4ECDC4" },
  { range: "85–100", count: 24, fill: "rgba(78,205,196,0.7)" },
];

// ─── AI Insights ───────────────────────────────────────────────────────────

export const AI_INSIGHTS: AIInsight[] = [
  {
    id: "i1",
    type: "trend",
    title: "YouTube engagement surge detected",
    body: "Your YouTube UES jumped from 78 to 91 this week, primarily driven by a 340% increase in comment activity on \"Full tutorial: Setting up your UES dashboard.\" The high comment-to-view ratio suggests viewers found actionable value — your tutorial format is outperforming your average by 2.3×.",
    confidence: "high",
    generatedAt: "2 hours ago",
  },
  {
    id: "i2",
    type: "warning",
    title: "X / Twitter score plateau warning",
    body: "Your X/Twitter UES has remained flat at 72–76 for 3 consecutive weeks. While impressions are growing, interaction depth (replies and bookmarks) is not scaling proportionally. Recommend shifting from broadcast-style posts to conversation-starter formats.",
    confidence: "medium",
    generatedAt: "1 day ago",
  },
  {
    id: "i3",
    type: "prediction",
    title: "Score prediction: Next 7 days",
    body: "Based on current posting cadence, content mix, and historical trends, your overall UES is predicted to reach 87–90 over the next 7 days — provided you maintain ≥3 posts on Instagram and publish at least one long-form YouTube video. LinkedIn is your highest-growth opportunity this period.",
    confidence: "medium",
    generatedAt: "3 days ago",
  },
];

// ─── Dashboard Stats ───────────────────────────────────────────────────────

export const DASHBOARD_STATS: DashboardStat[] = [
  { label: "Avg UES Score", value: 84, unit: ".2", change: "↑ 6.4% from last month", changeDirection: "up", icon: "⭐" },
  { label: "Total Posts", value: 127, change: "↑ 14 new this month", changeDirection: "up", icon: "📝", iconBg: "rgba(255,107,107,0.1)" },
  { label: "Platforms", value: 4, change: "Instagram, YT, X, LinkedIn", changeDirection: "neutral", icon: "🔗" },
  { label: "AI Insights", value: 3, change: "3 new this week", changeDirection: "up", icon: "🤖", iconBg: "rgba(255,107,107,0.1)" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getUESGradeColor(score: number): string {
  if (score >= 85) return "#4ECDC4";
  if (score >= 70) return "#4ECDC4";
  if (score >= 55) return "rgba(247,255,247,0.7)";
  return "#FF6B6B";
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
