"use client";

import { AI_INSIGHTS } from "@/lib/data";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function AIInsightsSection() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span>✨</span> AI Insights Summary
          </CardTitle>
          <p className="text-sm text-mint-700 mt-1">Key takeaways from your recent activity</p>
        </div>
        <Badge variant="cyan">{AI_INSIGHTS.length} New</Badge>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        {AI_INSIGHTS.map((insight) => (
          <div key={insight.id} className="bg-teal-900/30 p-4 rounded-xl border border-cyan-border/10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-[var(--color-mint)]">{insight.title}</h4>
              <Badge variant={
                insight.type === 'warning' ? 'pink' :
                insight.type === 'trend' ? 'cyan' : 'teal'
              }>
                {insight.type}
              </Badge>
            </div>
            <p className="text-sm text-mint-700 leading-relaxed">
              {insight.body}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-mint-700">
              <span className="opacity-70">{insight.generatedAt}</span>
              <span className="opacity-70 capitalize">Confidence: {insight.confidence}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
