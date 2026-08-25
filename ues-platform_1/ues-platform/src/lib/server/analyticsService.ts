import type { Post, PlatformConnection } from "@/types";

export interface AnalyticsOverview {
  totalFollowers: number;
  totalReach: number | string;
  totalImpressions: number | string;
  totalEngagement: number;
  engagementRate: string;
  totalPosts: number;
  averageScore: number;
  bestPlatform: string;
}

export interface PlatformMetricsSummary {
  platformId: string;
  platformName: string;
  ues: number | string;
  followers: number | string;
  engagementRate: string;
  reach: number | string;
  totalPosts: number;
  impressions: number | string;
  engagement: number;
  change: string;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  fill: string;
}

export interface AIInsightItem {
  id: string;
  type: "warning" | "trend" | "teal";
  title: string;
  body: string;
  generatedAt: string;
  confidence: "High" | "Low" | "Insufficient historical data";
}

export interface AnalyticsPayload {
  overview: AnalyticsOverview;
  globalUes: {
    score: number;
    grade: string;
    industryPercentile: string;
    trend: number | string;
  };
  components: {
    normalizedReach: number;
    interactionDepth: number;
    amplification: number;
    retentionSignal: number;
  };
  platformBreakdown: Record<string, PlatformMetricsSummary>;
  crossPlatformComparison: Array<{
    platform: string;
    posts: number;
    avgReach: number | string;
    aiScore: number;
    engagement: string;
  }>;
  scoreDistribution: ScoreDistribution[];
  topPerformingPosts: Post[];
  aiInsights: AIInsightItem[];
  aiAnalyzedPosts: Post[];
}

export class AnalyticsService {
  static getAnalytics(
    currentPosts: Post[],
    previousPosts: Post[],
    connections: Record<string, PlatformConnection>,
    daysFilter: number,
    allPosts?: Post[]
  ): AnalyticsPayload {
    const validPlatforms = ["instagram", "youtube", "facebook"];
    
    // Filter posts for valid platforms only
    const posts = currentPosts.filter((p) => validPlatforms.includes(p.platform));
    const prevPosts = previousPosts.filter((p) => validPlatforms.includes(p.platform));

    // 1. Calculate followers per platform
    const platformFollowers: Record<string, number> = {
      instagram: 0,
      youtube: 0,
      facebook: 0,
    };

    validPlatforms.forEach((plat) => {
      // Try to find the latest post metric from all historical posts
      const postsToScan = allPosts || posts;
      const platPosts = postsToScan.filter((p) => p.platform === plat);
      if (platPosts.length > 0) {
        const latestPost = platPosts.reduce((latest, current) => {
          return new Date(current.publishedAt) > new Date(latest.publishedAt) ? current : latest;
        });
        if (typeof latestPost.metrics?.followerCount === "number" && latestPost.metrics.followerCount > 0) {
          platformFollowers[plat] = latestPost.metrics.followerCount;
        }
      }
      
      // Fallback to connection store subscriber/followers info if 0
      if (platformFollowers[plat] === 0 && connections[plat]) {
        const conn = connections[plat] as any;
        platformFollowers[plat] = 
          Number(conn.subscriberCount || conn.followerCount || conn.fanCount || conn.followers || 0);
      }
    });

    const totalFollowers = platformFollowers.instagram + platformFollowers.youtube + platformFollowers.facebook;

    // 2. Calculations for current period
    let totalReach = 0;
    let totalImpressions = 0;
    let totalEngagement = 0;
    let overallDenominator = 0;
    let sumUES = 0;

    const platformStats = validPlatforms.reduce((acc, plat) => {
      acc[plat] = {
        views: 0,
        reach: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        uesSum: 0,
        postsCount: 0,
      };
      return acc;
    }, {} as Record<string, any>);

    posts.forEach((post) => {
      const plat = post.platform;
      const metrics = post.metrics || {};
      const views = Number(metrics.views) || 0;
      const reach = Number(metrics.reach) || 0;
      const impressions = Number(metrics.impressions) || 0;
      const likes = Number(metrics.likes) || 0;
      const comments = Number(metrics.comments) || 0;
      const shares = Number(metrics.shares) || 0;
      const saves = Number(metrics.saves) || 0;
      const score = Number(post.uesScore) || 0;

      platformStats[plat].views += views;
      platformStats[plat].reach += reach;
      platformStats[plat].impressions += impressions;
      platformStats[plat].likes += likes;
      platformStats[plat].comments += comments;
      platformStats[plat].shares += shares;
      platformStats[plat].saves += saves;
      platformStats[plat].uesSum += score;
      platformStats[plat].postsCount += 1;

      totalEngagement += (likes + comments + shares + saves);
      sumUES += score;
    });

    // If a platform is connected but has no posts in the selected date range, fall back to its historical all-time posts in the database
    validPlatforms.forEach((plat) => {
      const isConnected = connections[plat]?.connected;
      if (isConnected && platformStats[plat].postsCount === 0 && allPosts) {
        const platAllPosts = allPosts.filter((p) => p.platform === plat);
        platAllPosts.forEach((post) => {
          const metrics = post.metrics || {};
          const views = Number(metrics.views) || 0;
          const reach = Number(metrics.reach) || 0;
          const impressions = Number(metrics.impressions) || 0;
          const likes = Number(metrics.likes) || 0;
          const comments = Number(metrics.comments) || 0;
          const shares = Number(metrics.shares) || 0;
          const saves = Number(metrics.saves) || 0;
          const score = Number(post.uesScore) || 0;

          platformStats[plat].views += views;
          platformStats[plat].reach += reach;
          platformStats[plat].impressions += impressions;
          platformStats[plat].likes += likes;
          platformStats[plat].comments += comments;
          platformStats[plat].shares += shares;
          platformStats[plat].saves += saves;
          platformStats[plat].uesSum += score;
          platformStats[plat].postsCount += 1;

          totalEngagement += (likes + comments + shares + saves);
          sumUES += score;
        });
      }
    });

    // Overview total reach: Instagram Reach + Facebook Reach
    totalReach = platformStats.instagram.reach + platformStats.facebook.reach;
    
    // Overview total impressions: Instagram Impressions + Facebook Impressions
    totalImpressions = platformStats.instagram.impressions + platformStats.facebook.impressions;

    // Overall Engagement Rate denominator: Reach for Meta platforms, Views for YouTube
    overallDenominator = platformStats.instagram.reach + platformStats.facebook.reach + platformStats.youtube.views;
    const engagementRate = overallDenominator > 0 ? ((totalEngagement / overallDenominator) * 100).toFixed(2) : "N/A";

    const totalPosts = Object.values(platformStats).reduce((acc: number, p: any) => acc + p.postsCount, 0);
    const averageScore = totalPosts > 0 ? Math.round(sumUES / totalPosts) : 0;

    // Find Best Platform based on total views/reach and total engagement (highest sum of views + engagement)
    let bestPlatformName = "None";
    let maxViewsAndEngagement = -1;
    validPlatforms.forEach((plat) => {
      if (connections[plat]?.connected) {
        const stats = platformStats[plat];
        const viewsOrReach = plat === "youtube" ? stats.views : stats.reach;
        const totalEng = stats.likes + stats.comments + stats.shares + stats.saves;
        const scoreMetric = viewsOrReach + totalEng;
        if (scoreMetric > maxViewsAndEngagement) {
          maxViewsAndEngagement = scoreMetric;
          bestPlatformName = plat === "youtube" ? "YouTube" : plat === "instagram" ? "Instagram" : "Facebook";
        }
      }
    });

    // 3. Score Components (sub-scores)
    let reachScoreSum = 0;
    let interactionScoreSum = 0;
    let amplificationScoreSum = 0;
    let retentionScoreSum = 0;

    posts.forEach((p) => {
      const v = p.metrics?.views ?? 0;
      const r = p.metrics?.reach ?? 0;
      const l = p.metrics?.likes ?? 0;
      const c = p.metrics?.comments ?? 0;
      const sh = p.metrics?.shares ?? 0;
      const sa = p.metrics?.saves ?? 0;

      const denom = r > 0 ? r : v > 0 ? v : 1000;

      const reachScore = 50 * (1 - Math.exp(-0.00005 * v)) + 50 * (1 - Math.exp(-0.01 * r));
      reachScoreSum += Math.min(100, Math.max(0, reachScore));

      const interactionScore = 100 * (1 - Math.exp(-15 * (l / denom)));
      interactionScoreSum += Math.min(100, Math.max(0, interactionScore));

      const amplificationScore = 100 * (1 - Math.exp(-25 * (sh / denom)));
      amplificationScoreSum += Math.min(100, Math.max(0, amplificationScore));

      const retentionScore = 100 * (1 - Math.exp(-40 * ((c + sa) / denom)));
      retentionScoreSum += Math.min(100, Math.max(0, retentionScore));
    });

    const normalizedReach = totalPosts > 0 ? Math.round(reachScoreSum / totalPosts) : 0;
    const interactionDepth = totalPosts > 0 ? Math.round(interactionScoreSum / totalPosts) : 0;
    const amplification = totalPosts > 0 ? Math.round(amplificationScoreSum / totalPosts) : 0;
    const retentionSignal = totalPosts > 0 ? Math.round(retentionScoreSum / totalPosts) : 0;

    // 4. Calculations for previous period (for trend indicators)
    const prevPlatformStats = validPlatforms.reduce((acc, plat) => {
      acc[plat] = { uesSum: 0, postsCount: 0 };
      return acc;
    }, {} as Record<string, any>);

    let prevSumUES = 0;
    prevPosts.forEach((post) => {
      const plat = post.platform;
      const score = Number(post.uesScore) || 0;
      prevPlatformStats[plat].uesSum += score;
      prevPlatformStats[plat].postsCount += 1;
      prevSumUES += score;
    });

    const prevAverageScore = prevPosts.length > 0 ? Math.round(prevSumUES / prevPosts.length) : 0;
    let trendPercent: number | string = "N/A";
    if (prevAverageScore > 0) {
      trendPercent = Number((((averageScore - prevAverageScore) / prevAverageScore) * 100).toFixed(1));
    }

    // Dynamic UES Grade
    const grade = 
      averageScore >= 90 ? "A+" :
      averageScore >= 80 ? "A" :
      averageScore >= 70 ? "B" :
      averageScore >= 60 ? "C" :
      averageScore >= 50 ? "D" : "F";

    // 5. Build dynamic platform breakdown cards
    const platformBreakdown: Record<string, PlatformMetricsSummary> = {};

    validPlatforms.forEach((plat) => {
      const cur = platformStats[plat];
      const prev = prevPlatformStats[plat];

      const isConnected = connections[plat]?.connected;

      const ues = isConnected && cur.postsCount > 0 ? Math.round(cur.uesSum / cur.postsCount) : "N/A";
      const followers = isConnected ? platformFollowers[plat] : "N/A";

      // Denominator and reach mappings: Reach for Meta platforms, Views for YouTube
      let reach: number | string = "N/A";
      let impressions: number | string = "N/A";
      let engDenominator = 0;

      if (isConnected) {
        if (plat === "youtube") {
          reach = cur.views;
          engDenominator = cur.views;
        } else {
          reach = cur.reach;
          impressions = cur.impressions;
          engDenominator = cur.reach;
        }
      }

      const totalEng = cur.likes + cur.comments + cur.shares + cur.saves;
      const engRate = isConnected ? (engDenominator > 0 ? ((totalEng / engDenominator) * 100).toFixed(2) : "0.00") : "N/A";

      // Calculate period change vs previous period UES
      let change = "N/A";
      if (isConnected && typeof ues === "number") {
        const prevUES = prev.postsCount > 0 ? Math.round(prev.uesSum / prev.postsCount) : 0;
        if (prevUES > 0) {
          const diff = ((ues - prevUES) / prevUES) * 100;
          change = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
        }
      }

      platformBreakdown[plat] = {
        platformId: plat,
        platformName: plat === "youtube" ? "YouTube" : plat === "instagram" ? "Instagram" : "Facebook",
        ues,
        followers,
        engagementRate: engRate === "N/A" ? "N/A" : `${engRate}%`,
        reach,
        totalPosts: isConnected ? cur.postsCount : 0,
        impressions,
        engagement: isConnected ? totalEng : 0,
        change,
      };
    });

    // 6. Cross-platform comparison table
    const crossPlatformComparison = validPlatforms.map((plat) => {
      const stats = platformStats[plat];
      const ues = stats.postsCount > 0 ? Math.round(stats.uesSum / stats.postsCount) : 0;
      const totalEng = stats.likes + stats.comments + stats.shares + stats.saves;
      const denom = plat === "youtube" ? stats.views : stats.reach;
      const rate = denom > 0 ? ((totalEng / denom) * 100).toFixed(1) : "0.0";
      const reachVal = plat === "youtube" ? stats.views : stats.reach;
      const isConnected = connections[plat]?.connected;

      return {
        platform: plat === "youtube" ? "YouTube" : plat === "instagram" ? "Instagram" : "Facebook",
        posts: isConnected ? stats.postsCount : 0,
        avgReach: isConnected ? (stats.postsCount > 0 && reachVal > 0 ? Math.round(reachVal / stats.postsCount) : 0) : "N/A",
        aiScore: isConnected ? ues : 0,
        engagement: isConnected ? `${rate}%` : "0.0%",
      };
    });

    // 7. Score bands distribution
    const scoreRanges = [
      { range: "0–40", count: 0, fill: "rgba(255,107,107,0.6)" },
      { range: "40–55", count: 0, fill: "rgba(255,107,107,0.5)" },
      { range: "55–70", count: 0, fill: "rgba(78,205,196,0.5)" },
      { range: "70–85", count: 0, fill: "#4ECDC4" },
      { range: "85–100", count: 0, fill: "rgba(78,205,196,0.7)" },
    ];

    posts.forEach((p) => {
      const score = p.uesScore;
      if (score <= 40) scoreRanges[0].count++;
      else if (score <= 55) scoreRanges[1].count++;
      else if (score <= 70) scoreRanges[2].count++;
      else if (score <= 85) scoreRanges[3].count++;
      else scoreRanges[4].count++;
    });

    // 8. Top performing posts
    const topPerformingPosts = [...posts]
      .sort((a, b) => b.uesScore - a.uesScore)
      .slice(0, 5);

    // 9. Structured AI Insights summary (Rule-based, 100% data-driven)
    const aiInsights: AIInsightItem[] = [];
    const confidence = totalPosts >= 5 ? "High" : totalPosts > 0 ? "Low" : "Insufficient historical data";

    if (totalPosts > 0) {
      // Trend Insight
      let bestPlat = "";
      let highestRate = -1;
      validPlatforms.forEach((plat) => {
        const summary = platformBreakdown[plat];
        if (summary.engagementRate !== "N/A") {
          const rateNum = parseFloat(summary.engagementRate);
          if (rateNum > highestRate) {
            highestRate = rateNum;
            bestPlat = summary.platformName;
          }
        }
      });

      if (bestPlat) {
        aiInsights.push({
          id: "ai-1",
          type: "trend",
          title: `${bestPlat} engagement is leading your portfolio`,
          body: `Your ${bestPlat} posts are currently achieving a dynamic engagement rate of ${highestRate.toFixed(2)}%, outperforming your other connected channels. Audience interaction signals remain strong.`,
          generatedAt: "Just now",
          confidence,
        });
      }

      // Performance Winner Insight
      const typesMap: Record<string, { uesSum: number; count: number }> = {};
      posts.forEach((p) => {
        if (!typesMap[p.type]) typesMap[p.type] = { uesSum: 0, count: 0 };
        typesMap[p.type].uesSum += p.uesScore;
        typesMap[p.type].count++;
      });

      let bestType = "";
      let highestTypeAvg = -1;
      Object.entries(typesMap).forEach(([t, info]) => {
        const avg = info.uesSum / info.count;
        if (avg > highestTypeAvg) {
          highestTypeAvg = avg;
          bestType = t;
        }
      });

      if (bestType) {
        const ratio = averageScore > 0 ? (highestTypeAvg / averageScore).toFixed(1) : "1.0";
        aiInsights.push({
          id: "ai-2",
          type: "teal",
          title: `Format optimization: ${bestType} content leads`,
          body: `Analysis of your post formats shows that ${bestType} uploads achieve an average UES of ${Math.round(highestTypeAvg)}. This outperforms your overall catalog average by ${ratio}×.`,
          generatedAt: "Just now",
          confidence,
        });
      }

      // Weak Area Insight
      let weakestPlat = "";
      let lowestAvg = 101;
      validPlatforms.forEach((plat) => {
        const summary = platformBreakdown[plat];
        if (typeof summary.ues === "number" && summary.ues < lowestAvg) {
          lowestAvg = summary.ues;
          weakestPlat = summary.platformName;
        }
      });

      if (weakestPlat && lowestAvg < 101) {
        aiInsights.push({
          id: "ai-3",
          type: "warning",
          title: `Enhance hook rate on ${weakestPlat}`,
          body: `Your average performance score on ${weakestPlat} is currently ${lowestAvg}/100. Improving the initial 3-second hook structure can help raise views and boost retention depth.`,
          generatedAt: "Just now",
          confidence,
        });
      }
    } else {
      aiInsights.push({
        id: "ai-empty",
        type: "teal",
        title: "Insufficient data for AI Analysis",
        body: "Please connect platform accounts and sync content to generate data-driven AI insights.",
        generatedAt: "Just now",
        confidence: "Insufficient historical data",
      });
    }

    // Pick the top 5 most recent posts for AI Post Analysis and generate analysis dynamically
    const aiAnalyzedPosts = [...posts]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 5)
      .map(p => ({
        ...p,
        aiAnalysis: AnalyticsService.generatePostAIAnalysis(p)
      }));

    return {
      overview: {
        totalFollowers,
        totalReach: (connections.instagram?.connected || connections.facebook?.connected) ? totalReach : "N/A",
        totalImpressions: (connections.instagram?.connected || connections.facebook?.connected) ? totalImpressions : "N/A",
        totalEngagement,
        engagementRate: engagementRate === "N/A" ? "N/A" : `${engagementRate}%`,
        totalPosts,
        averageScore,
        bestPlatform: bestPlatformName,
      },
      globalUes: {
        score: averageScore,
        grade,
        industryPercentile: "Industry benchmark unavailable",
        trend: trendPercent,
      },
      components: {
        normalizedReach,
        interactionDepth,
        amplification,
        retentionSignal,
      },
      platformBreakdown,
      crossPlatformComparison,
      scoreDistribution: scoreRanges,
      topPerformingPosts,
      aiInsights,
      aiAnalyzedPosts,
    };
  }

  static generatePostAIAnalysis(post: Post): any {
    const views = post.metrics?.views ?? 0;
    const likes = post.metrics?.likes ?? 0;
    const comments = post.metrics?.comments ?? 0;
    const shares = post.metrics?.shares ?? 0;
    const saves = post.metrics?.saves ?? 0;
    const reach = post.metrics?.reach ?? 0;
    const score = post.uesScore ?? 50;

    // Calculate platformScore based on UES score
    const platformScore = score;
    const confidenceScore = score >= 50 ? 85 : 45; // Low confidence if no posts or very low scores
    const engagementScore = score;
    const overallRating = Number((score / 20).toFixed(1));
    
    const contentQuality = 
      overallRating > 4.5 ? "Exceptional" : 
      overallRating > 4.0 ? "Great" : 
      overallRating > 3.0 ? "Good" : "Needs Work";

    const platformScoreLabel = 
      score >= 90 ? "Top 5%" : 
      score >= 75 ? "Above Avg" : "Average";

    const performanceBadge = 
      score >= 90 ? "Excellent" : 
      score >= 75 ? "Trending" : "Needs Improvement";

    // Detect sentiment based on UES score or keywords
    const sentiment = 
      score >= 80 ? "Positive" : 
      score >= 60 ? "Engaging" : "Neutral";

    // Recommendations based on real metrics
    const recommendations: string[] = [];
    if (post.platform === "youtube") {
      if (views > 0 && likes / views < 0.02) {
        recommendations.push("Like conversion rate is low. Try adding a direct call-to-action asking viewers to hit like.");
      }
      if (views > 0 && comments / views < 0.002) {
        recommendations.push("Encourage discussions in comments by asking a pin-worthy question.");
      }
      if (views > 10000) {
        recommendations.push("Consider repurposing this high-view video into a YouTube Short.");
      }
    } else if (post.platform === "instagram") {
      if (likes > 0 && saves / likes < 0.05) {
        recommendations.push("Saves conversion rate is low. Focus on educational or highly referenceable content.");
      }
      if (comments < 5) {
        recommendations.push("Prompt engagement by asking viewers to drop their thoughts or tag a friend.");
      }
    } else if (post.platform === "facebook") {
      if (shares < 3) {
        recommendations.push("Shares are low. Try sharing highly shareable stats, infographics, or relatable industry memes.");
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("Post is performing optimally. Continue maintaining content consistency.");
    }

    return {
      platformScore,
      platformScoreLabel,
      confidenceScore,
      contentQuality,
      engagementScore,
      overallRating,
      performanceBadge,
      captionScore: Math.min(100, Math.max(50, score + 5)),
      hashtagScore: Math.min(100, Math.max(50, score - 5)),
      hookScore: Math.min(100, Math.max(50, score + 2)),
      ctaScore: Math.min(100, Math.max(50, score - 2)),
      readabilityScore: Math.min(100, Math.max(50, score + 4)),
      sentiment,
      recommendations,
    };
  }
}
