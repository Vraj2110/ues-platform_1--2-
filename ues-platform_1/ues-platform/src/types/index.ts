// ─── Platform Types ────────────────────────────────────────────────────────

export type PlatformId =
  | "instagram"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "tiktok"
  | "facebook";

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
  | "short";

export type PostStatus = "active" | "archived" | "draft";

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  saves: number;
  followerCount: number;
}

export interface Post {
  id: string;
  platform: PlatformId;
  title: string;
  url?: string;
  type: PostType;
  status: PostStatus;
  metrics: PostMetrics;
  uesScore: number;
  publishedAt: string;
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
  twitter?: number;
  linkedin?: number;
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
  provider?: string;
  lastSync?: string;
  lastError?: string;
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
