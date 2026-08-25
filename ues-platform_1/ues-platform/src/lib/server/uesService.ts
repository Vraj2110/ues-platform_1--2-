import { PostMetrics } from "@/types";

export interface UESWeightConfig {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
}

// Configurable weights as requested by the user
export const UES_WEIGHTS: UESWeightConfig = {
  likes: 1.0,
  comments: 3.0,
  shares: 4.0,
  saves: 4.0,
  views: 0.1,
};

/**
 * Calculates a fair, normalized Unified Engagement Score between 0 and 100
 * along with the platform-agnostic engagement rate.
 */
export function calculateUnifiedEngagement(
  metrics: PostMetrics
): { score: number; engagementRate: number | null } {
  // If all metrics are absent, return a default 0/null
  if (
    metrics.likes === null &&
    metrics.comments === null &&
    metrics.shares === null &&
    metrics.saves === null &&
    metrics.views === null &&
    metrics.reach === null &&
    metrics.impressions === null
  ) {
    return { score: 0, engagementRate: null };
  }

  const likes = metrics.likes ?? 0;
  const comments = metrics.comments ?? 0;
  const shares = metrics.shares ?? 0;
  const saves = metrics.saves ?? 0;
  const views = metrics.views ?? 0;
  const reach = metrics.reach ?? null;
  const impressions = metrics.impressions ?? null;

  // 1. Calculate platform-agnostic engagement rate
  const total_engagement = likes + comments + shares + saves;
  
  // Prefer reach, fallback to views, then impressions
  const denominator = reach ?? views ?? impressions ?? null;
  let engagementRate: number | null = null;
  
  if (denominator !== null && denominator > 0) {
    engagementRate = (total_engagement / denominator) * 100;
  }

  // 2. Compute the weighted components using configurable weights
  const weightedLikes = likes * UES_WEIGHTS.likes;
  const weightedComments = comments * UES_WEIGHTS.comments;
  const weightedShares = shares * UES_WEIGHTS.shares;
  const weightedSaves = saves * UES_WEIGHTS.saves;
  const weightedViews = views * UES_WEIGHTS.views;

  const totalPoints = weightedLikes + weightedComments + weightedShares + weightedSaves + weightedViews;

  // 3. Normalization logic to scale the points fairly to 0 - 100 scale:
  // Using logarithmic/sigmoid scaling to ensure high engagement yields higher scores, 
  // but respects platform-independent sizes (views) without letting massive view numbers scale infinitely.
  const normDenom = reach ?? views ?? impressions ?? 1000;
  const interactionRatio = normDenom > 0 ? (totalPoints / normDenom) : 0;

  // Blending interaction quality (ratio of weighted interaction points) 
  // and overall views to represent reach.
  const scoreQuality = 60 * (1 - Math.exp(-15 * interactionRatio));
  const scoreScale = 40 * (1 - Math.exp(-0.00005 * views));
  const score = Math.min(100, Math.max(0, Math.round(scoreQuality + scoreScale)));

  return {
    score,
    engagementRate: engagementRate !== null ? parseFloat(engagementRate.toFixed(2)) : null
  };
}
