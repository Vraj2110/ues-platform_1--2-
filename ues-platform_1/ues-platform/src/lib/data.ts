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
  { id: "x", name: "X / Twitter", icon: "🐦", color: "#F7FFF7", connected: true, uesScore: 74 },
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
    aiAnalysis: {
      platformScore: 94,
      platformScoreLabel: "Top 5%",
      confidenceScore: 94,
      contentQuality: "Exceptional",
      engagementScore: 91,
      overallRating: 4.8,
      performanceBadge: "Excellent",
      captionScore: 88,
      hashtagScore: 75,
      hookScore: 92,
      ctaScore: 85,
      readabilityScore: 90,
      sentiment: "Positive",
      recommendations: ["Great authentic footage.", "Consider a stronger CTA at the end."]
    }
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
    aiAnalysis: {
      platformScore: 89,
      platformScoreLabel: "Top 10%",
      confidenceScore: 92,
      contentQuality: "Great",
      engagementScore: 87,
      overallRating: 4.5,
      performanceBadge: "Great",
      captionScore: 90,
      hashtagScore: 80,
      hookScore: 88,
      ctaScore: 78,
      readabilityScore: 85,
      sentiment: "Informative",
      recommendations: ["Technical deep dives perform well.", "Add timestamps to the description."]
    }
  },
  {
    id: "p3",
    platform: "x",
    title: "Hot take: engagement rate is a useless metric",
    type: "thread",
    status: "active",
    metrics: { likes: 2140, comments: 384, shares: 641, views: 89400, saves: 312, followerCount: 12600 },
    uesScore: 74,
    publishedAt: "2024-03-10",
    aiAnalysis: {
      platformScore: 82,
      platformScoreLabel: "Above Avg",
      confidenceScore: 90,
      contentQuality: "Great",
      engagementScore: 74,
      overallRating: 4.0,
      performanceBadge: "Great",
      captionScore: 95,
      hashtagScore: 60,
      hookScore: 98,
      ctaScore: 70,
      readabilityScore: 88,
      sentiment: "Provocative",
      recommendations: ["Strong conversational piece.", "Keep utilizing hot takes."]
    }
  },
  {
    id: "p_fb1",
    platform: "facebook",
    title: "Company update: New features rolling out!",
    type: "post",
    status: "active",
    metrics: { likes: 1250, comments: 145, shares: 320, views: 24500, saves: 40, followerCount: 45000 },
    uesScore: 78,
    publishedAt: "2024-03-09",
    aiAnalysis: {
      platformScore: 75,
      platformScoreLabel: "Average",
      confidenceScore: 88,
      contentQuality: "Good",
      engagementScore: 78,
      overallRating: 3.5,
      performanceBadge: "Average",
      captionScore: 75,
      hashtagScore: 50,
      hookScore: 65,
      ctaScore: 60,
      readabilityScore: 92,
      sentiment: "Neutral",
      recommendations: ["Standard update.", "Add a stronger hook or interactive question."]
    }
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
    aiAnalysis: {
      platformScore: 65,
      platformScoreLabel: "Below Avg",
      confidenceScore: 85,
      contentQuality: "Good",
      engagementScore: 68,
      overallRating: 3.0,
      performanceBadge: "Needs Improvement",
      captionScore: 70,
      hashtagScore: 80,
      hookScore: 60,
      ctaScore: 65,
      readabilityScore: 85,
      sentiment: "Positive",
      recommendations: ["Static photos have lower reach.", "Try a Reel next time."]
    }
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
    aiAnalysis: {
      platformScore: 98,
      platformScoreLabel: "Top 1%",
      confidenceScore: 96,
      contentQuality: "Exceptional",
      engagementScore: 95,
      overallRating: 4.9,
      performanceBadge: "Excellent",
      captionScore: 92,
      hashtagScore: 85,
      hookScore: 95,
      ctaScore: 98,
      readabilityScore: 88,
      sentiment: "Educational",
      recommendations: ["Extremely high utility.", "Repurpose as a short or Reel."]
    }
  }
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
    x: 74,
    linkedin: 88,
    tiktok: 0,
    facebook: 0,
    threads: 0,
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
  { date: "Mar 1", ues: 76, instagram: 72, youtube: 80, facebook: 76 },
  { date: "Mar 2", ues: 74, instagram: 70, youtube: 78, facebook: 74 },
  { date: "Mar 3", ues: 79, instagram: 75, youtube: 84, facebook: 78 },
  { date: "Mar 4", ues: 77, instagram: 73, youtube: 82, facebook: 77 },
  { date: "Mar 5", ues: 82, instagram: 78, youtube: 90, facebook: 80 },
  { date: "Mar 6", ues: 80, instagram: 76, youtube: 88, facebook: 79 },
  { date: "Mar 7", ues: 78, instagram: 74, youtube: 85, facebook: 78 },
  { date: "Mar 8", ues: 81, instagram: 77, youtube: 87, facebook: 81 },
  { date: "Mar 9", ues: 83, instagram: 79, youtube: 89, facebook: 82 },
  { date: "Mar 10", ues: 80, instagram: 76, youtube: 86, facebook: 80 },
  { date: "Mar 11", ues: 85, instagram: 80, youtube: 92, facebook: 84 },
  { date: "Mar 12", ues: 83, instagram: 78, youtube: 90, facebook: 83 },
  { date: "Mar 13", ues: 87, instagram: 82, youtube: 93, facebook: 85 },
  { date: "Mar 14", ues: 84, instagram: 80, youtube: 91, facebook: 84 },
];

// ─── Platform Distribution ─────────────────────────────────────────────────

export const PLATFORM_DISTRIBUTION: PlatformDistribution[] = [
  { platform: "Instagram", count: 48, percentage: 46, color: "#FF6B6B" },
  { platform: "YouTube", count: 31, percentage: 30, color: "#4ECDC4" },
  { platform: "Facebook", count: 25, percentage: 24, color: "#1877F2" },
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

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || typeof n !== "number" || n < 0 || isNaN(n)) return "N/A";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

import { DashboardOverview, PlatformOverview } from "@/types";

export const DASHBOARD_OVERVIEW: DashboardOverview = {
  totalFollowers: 111000,
  totalReach: 325400,
  totalImpressions: 480200,
  totalEngagement: 25400,
  engagementRate: 5.2,
  totalPosts: 127,
  averageScore: 84.2,
  bestPlatform: "YouTube",
};

export const PLATFORM_OVERVIEW_DATA: PlatformOverview[] = [
  {
    platform: "Instagram",
    followers: 28400,
    posts: 48,
    reach: 67400,
    impressions: 89000,
    engagement: 7410,
    engagementRate: 8.3,
    growth: 4.2,
    aiScore: 82,
  },
  {
    platform: "YouTube",
    followers: 18200,
    posts: 31,
    reach: 142000,
    impressions: 212000,
    engagement: 8200,
    engagementRate: 3.8,
    growth: 12.5,
    aiScore: 91,
  },
  {
    platform: "X / Twitter",
    followers: 12600,
    posts: 28,
    reach: 89400,
    impressions: 110000,
    engagement: 3477,
    engagementRate: 3.1,
    growth: 1.8,
    aiScore: 74,
  },
  {
    platform: "Facebook",
    followers: 45000,
    posts: 15,
    reach: 24500,
    impressions: 48000,
    engagement: 1755,
    engagementRate: 3.6,
    growth: 0.5,
    aiScore: 78,
  },
  {
    platform: "LinkedIn",
    followers: 6800,
    posts: 20,
    reach: 18400,
    impressions: 21200,
    engagement: 1281,
    engagementRate: 6.0,
    growth: 5.4,
    aiScore: 88,
  },
];
