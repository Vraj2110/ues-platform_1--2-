"use client";

import { useState, useMemo } from "react";
import { formatNumber, getUESGradeColor } from "@/lib/data";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";
import type { Post, AIAnalysis } from "@/types";
import { getPlatformIcon } from "@/components/ui/PlatformIcons";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  facebook: "📘",
};

// Simple deterministic hash based on post ID
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateMockAIAnalysis(post: Post): AIAnalysis {
  if (post.aiAnalysis) return post.aiAnalysis; // use existing if present

  const hash = hashString(post.id);
  
  // Base metrics derived from UES
  const platformScore = Math.min(99, Math.max(40, post.uesScore + (hash % 10) - 5));
  const confidenceScore = 80 + (hash % 18);
  const engagementScore = Math.min(99, post.uesScore + (hash % 8));
  
  const overallRating = Number((platformScore / 20).toFixed(1));
  const contentQuality = overallRating > 4.5 ? "Exceptional" : overallRating > 4.0 ? "Great" : overallRating > 3.0 ? "Good" : "Needs Work";
  const platformScoreLabel = platformScore > 90 ? "Top 5%" : platformScore > 80 ? "Above Avg" : "Average";
  const performanceBadge = platformScore > 90 ? "Excellent" : platformScore > 75 ? "Trending" : "Needs Improvement";
  
  const sentiments = ["Positive", "Educational", "Inspiring", "Neutral", "Engaging"];
  const sentiment = sentiments[hash % sentiments.length];

  const recommendations = [
    post.platform === "youtube" ? "Consider creating a Short from this video." : "Include a stronger call-to-action.",
    (hash % 2 === 0) ? "Hashtag density was optimal." : "Try using more trending keywords in the hook.",
    "Engagement peaked within the first 2 hours."
  ];

  return {
    platformScore,
    platformScoreLabel,
    confidenceScore,
    contentQuality,
    engagementScore,
    overallRating,
    performanceBadge,
    captionScore: 70 + (hash % 25),
    hashtagScore: 65 + (hash % 30),
    hookScore: 75 + (hash % 20),
    ctaScore: 60 + (hash % 35),
    readabilityScore: 80 + (hash % 15),
    sentiment,
    recommendations,
  };
}

export function AIPostAnalysisWidget() {
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  
  const { allPosts, checkingYoutubeConnection } = useRealTimePosts();

  // Pick the top 5 most recent posts (with priority to live posts if available)
  const analyzedPosts = useMemo(() => {
    // Only analyze up to 5 posts to keep the UI clean
    return allPosts.slice(0, 5).map(post => ({
      ...post,
      aiAnalysis: generateMockAIAnalysis(post)
    }));
  }, [allPosts]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🤖</span> AI Post Analysis
        </CardTitle>
        <p className="text-sm text-mint-700 mt-1">
          {checkingYoutubeConnection ? "Syncing Live Data..." : "Cross-platform content deep dive"}
        </p>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        {analyzedPosts.length === 0 && !checkingYoutubeConnection && (
          <p className="text-sm text-mint-700 text-center py-4">No connected posts found to analyze.</p>
        )}
        
        {analyzedPosts.map((post) => {
          const isExpanded = selectedPost === post.id;
          const ai = post.aiAnalysis!;
          
          return (
            <div 
              key={post.id} 
              className={`border rounded-xl transition-all ${isExpanded ? 'border-cyan-ues bg-teal-card/50' : 'border-cyan-border/12 hover:border-cyan-ues/50'}`}
            >
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setSelectedPost(isExpanded ? null : post.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="flex items-center justify-center min-h-[28px] flex-shrink-0">{getPlatformIcon(post.platform, "sm") || PLATFORM_ICONS[post.platform] || "📱"}</span>
                  <div className="overflow-hidden">
                    <p className="font-medium text-[var(--color-mint)] truncate text-sm">{post.title}</p>
                    <p className="text-xs text-mint-700 capitalize mt-1">
                      {post.platform} • {formatNumber(post.metrics.views || 0)} views
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <p className="text-xs text-mint-700 font-medium">UES</p>
                    <p 
                      className="font-display font-bold text-lg leading-none"
                      style={{ color: getUESGradeColor(post.uesScore) }}
                    >
                      {post.uesScore}
                    </p>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 pt-0 border-t border-cyan-border/12 mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 mb-4">
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider">Platform Score</p>
                      <p className="text-lg font-bold text-cyan-ues mt-1">{ai.platformScore}</p>
                      <p className="text-xs text-mint-700">{ai.platformScoreLabel}</p>
                    </div>
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider">Confidence</p>
                      <p className="text-lg font-bold text-pink-ues mt-1">{ai.confidenceScore}%</p>
                      <p className="text-xs text-mint-700">AI Confidence</p>
                    </div>
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider">Quality</p>
                      <p className="text-lg font-bold text-[var(--color-mint)] mt-1">{ai.overallRating}/5</p>
                      <p className="text-xs text-mint-700">{ai.contentQuality}</p>
                    </div>
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider">Badge</p>
                      <div className="mt-1">
                        <Badge variant="cyan">{ai.performanceBadge}</Badge>
                      </div>
                      <p className="text-xs text-mint-700 mt-1 capitalize">{ai.sentiment} Sentiment</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold mb-2">Detailed Ratings</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="teal" className="border-cyan-border/20 text-mint-600">Caption: {ai.captionScore}</Badge>
                      <Badge variant="teal" className="border-cyan-border/20 text-mint-600">Hook: {ai.hookScore}</Badge>
                      <Badge variant="teal" className="border-cyan-border/20 text-mint-600">CTA: {ai.ctaScore}</Badge>
                      <Badge variant="teal" className="border-cyan-border/20 text-mint-600">Hashtags: {ai.hashtagScore}</Badge>
                      <Badge variant="teal" className="border-cyan-border/20 text-mint-600">Readability: {ai.readabilityScore}</Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold mb-2 flex items-center gap-1">
                      <span>💡</span> AI Recommendations
                    </p>
                    <ul className="list-disc list-inside text-sm text-[var(--color-mint)] space-y-1 ml-1">
                      {ai.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
