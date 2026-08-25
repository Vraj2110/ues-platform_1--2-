"use client";

import { useState } from "react";
import { formatNumber, getUESGradeColor } from "@/lib/data";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Post } from "@/types";
import { getPlatformIcon } from "@/components/ui/PlatformIcons";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  facebook: "📘",
};

interface AIPostAnalysisWidgetProps {
  posts: Post[];
}

export function AIPostAnalysisWidget({ posts = [] }: AIPostAnalysisWidgetProps) {
  const [selectedPost, setSelectedPost] = useState<string | null>(null);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🤖</span> AI Post Analysis
        </CardTitle>
        <p className="text-sm text-mint-700 mt-1">Cross-platform content deep dive</p>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        {posts.length === 0 && (
          <p className="text-sm text-mint-700 text-center py-4">No connected posts found to analyze.</p>
        )}
        
        {posts.map((post) => {
          const isExpanded = selectedPost === post.id;
          const ai = post.aiAnalysis;
          
          if (!ai) return null;

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
                  <span className="flex items-center justify-center min-h-[28px] flex-shrink-0">
                    {getPlatformIcon(post.platform, "sm") || PLATFORM_ICONS[post.platform] || "📱"}
                  </span>
                  <div className="overflow-hidden">
                    <p className="font-medium text-[var(--color-mint)] truncate text-sm">{post.title}</p>
                    <p className="text-xs text-mint-700 capitalize mt-1 font-mono">
                      {post.platform} • {formatNumber(post.metrics.views || post.metrics.reach || 0)} {post.platform === "youtube" ? "views" : "reach"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <p className="text-xs text-mint-700 font-medium font-mono">UES</p>
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
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">Platform Score</p>
                      <p className="text-lg font-bold text-cyan-ues mt-1">{ai.platformScore}</p>
                      <p className="text-xs text-mint-700">{ai.platformScoreLabel}</p>
                    </div>
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">Confidence</p>
                      <p className="text-lg font-bold text-pink-ues mt-1">{ai.confidenceScore}%</p>
                      <p className="text-xs text-mint-700">AI Confidence</p>
                    </div>
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">Quality</p>
                      <p className="text-lg font-bold text-[var(--color-mint)] mt-1">{ai.overallRating}/5</p>
                      <p className="text-xs text-mint-700">{ai.contentQuality}</p>
                    </div>
                    <div className="bg-teal-900/30 p-3 rounded-lg">
                      <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">Badge</p>
                      <div className="mt-1">
                        <Badge variant="cyan">{ai.performanceBadge}</Badge>
                      </div>
                      <p className="text-xs text-mint-700 mt-1 capitalize font-mono">{ai.sentiment} Sentiment</p>
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
                      {ai.recommendations.map((rec: string, i: number) => (
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
