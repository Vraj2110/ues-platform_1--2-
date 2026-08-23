// ─── Platform Types ────────────────────────────────────────────────────────

export type PlatformId =
  | "instagram"
  | "youtube"
  | "x"
  | "linkedin"
  | "tiktok"
  | "facebook"
  | "threads";

export interface Platform {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  uesScore?: number;
}

// ─── Post Types ────────────────────────────────────────────────────────────

export type PostType =
  | "reel"
  | "photo"
  | "story"
  | "video"
  | "thread"
  | "article"
  | "short"
  | "post";

export type PostStatus = "active" | "archived" | "draft";

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  followerCount: number;
}

export interface AIAnalysis {
  platformScore: number;
  platformScoreLabel: string;
  confidenceScore: number;
  contentQuality: string;
  engagementScore: number;
  overallRating: number;
  performanceBadge: string;
  captionScore: number;
  hashtagScore: number;
  hookScore: number;
  ctaScore: number;
  readabilityScore: number;
  sentiment: string;
  recommendations: string[];
}

export interface Post {
  id: string;
  platform: PlatformId;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  type: PostType;
  status: PostStatus;
  privacyStatus?: string;
  metrics: PostMetrics;
  uesScore: number;
  publishedAt: string;
  aiAnalysis?: AIAnalysis;
}

// ─── UES Score Types ───────────────────────────────────────────────────────

export interface UESComponents {
  normalizedReach: number;
  interactionDepth: number;
  amplification: number;
  retentionSignal: number;
}

export interface UESScore {
  overall: number;
  grade: "A+" | "A" | "B+" | "B" | "C" | "D";
  components: UESComponents;
  platformBreakdown: Record<PlatformId, number>;
  trend: number; // percentage change from last period
}

export interface MetricWeight {
  metric: keyof PostMetrics;
  label: string;
  weight: number;
}

// ─── Analytics Types ───────────────────────────────────────────────────────

export interface TimeSeriesDataPoint {
  date: string;
  ues: number;
  instagram?: number;
  youtube?: number;
  x?: number;
  linkedin?: number;
  facebook?: number;
  threads?: number;
}

export interface PlatformDistribution {
  platform: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ScoreBand {
  range: string;
  count: number;
  fill: string;
}

// ─── AI Insight Types ──────────────────────────────────────────────────────

export type InsightType = "trend" | "warning" | "prediction" | "opportunity";

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  body: string;
  confidence: "high" | "medium" | "low";
  generatedAt: string;
}

// ─── User / Auth Types ─────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  organization: string;
  plan: "free" | "pro" | "enterprise";
  avatarInitials: string;
}
export interface PlatformConnection {
  platformId: PlatformId;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  channelId?: string;
  provider?: string;
  lastSync?: string;
  lastError?: string;
  analytics?: Record<string, unknown>;
}

export interface PlatformAnalytics {
  platformId: PlatformId;
  connected: boolean;
  followers?: number;
  reach?: number;
  engagement?: number;
  likes?: number;
  comments?: number;
  views?: number;
  lastUpdated?: string;
  topPosts?: Array<{
    id: string;
    title: string;
    thumbnailUrl?: string;
    publishedAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    engagementRate?: number;
  }>;
}
// ─── Dashboard Stat Types ──────────────────────────────────────────────────

export interface DashboardStat {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeDirection?: "up" | "down" | "neutral";
  icon: string;
  iconBg?: string;
}

export interface PlatformOverview {
  platform: string;
  followers: number;
  posts: number;
  reach: number;
  impressions: number;
  engagement: number;
  engagementRate: number;
  growth: number;
  aiScore: number;
}

export interface DashboardOverview {
  totalFollowers: number;
  totalReach: number;
  totalImpressions: number;
  totalEngagement: number;
  engagementRate: number;
  totalPosts: number;
  averageScore: number;
  bestPlatform: string;
}
