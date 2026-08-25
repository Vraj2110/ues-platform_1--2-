"use client";

import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface AIInsightItem {
  id: string;
  type: "warning" | "trend" | "teal";
  title: string;
  body: string;
  generatedAt: string;
  confidence: "High" | "Low" | "Insufficient historical data";
}

interface AIInsightsSectionProps {
  insights: AIInsightItem[];
}

export function AIInsightsSection({ insights = [] }: AIInsightsSectionProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span>✨</span> AI Insights Summary
          </CardTitle>
          <p className="text-sm text-mint-700 mt-1">Key takeaways from your recent activity</p>
        </div>
        <Badge variant="cyan">{insights.length} New</Badge>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        {insights.length === 0 && (
          <p className="text-sm text-mint-700 text-center py-4">No insights generated yet. Ensure platforms are connected.</p>
        )}

        {insights.map((insight) => (
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
            <div className="mt-3 flex items-center justify-between text-xs text-mint-700 font-mono">
              <span className="opacity-70">{insight.generatedAt}</span>
              <span className="opacity-70 capitalize">Confidence: {insight.confidence}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
