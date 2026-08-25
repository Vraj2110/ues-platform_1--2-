"use client";

import { getUESGradeColor } from "@/lib/data";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";
import { UESGaugeChart } from "@/components/charts/Charts";
import { Badge } from "@/components/ui/Badge";

interface PerformanceScoreWidgetProps {
  score: number;
  grade: string;
  trend: number | string;
  percentile: string;
}

export function PerformanceScoreWidget({
  score,
  grade,
  trend,
  percentile,
}: PerformanceScoreWidgetProps) {
  const gradeColor = getUESGradeColor(score);
  const trendText = typeof trend === "number" ? `${trend >= 0 ? "↑" : "↓"} ${Math.abs(trend)}% vs last period` : "Trend N/A";

  return (
    <Card className="flex flex-col h-full items-center text-center justify-center relative overflow-hidden">
      <div 
        className="absolute top-0 left-0 w-full h-1" 
        style={{ backgroundColor: gradeColor }} 
      />
      
      <CardHeader className="w-full pb-0 pt-6">
        <CardTitle>Global UES Score</CardTitle>
        <p className="text-sm text-mint-700 mt-1">Cross-platform aggregate</p>
      </CardHeader>

      <CardContent className="flex flex-col items-center pt-4 pb-6 w-full">
        <div className="w-[180px] h-[180px] relative mb-4">
          <UESGaugeChart score={score} />
          <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
            <span className="text-4xl font-display font-black leading-none" style={{ color: gradeColor }}>
              {score}
            </span>
            <span className="text-xs uppercase tracking-widest text-mint-700 mt-1 font-bold">
              Grade {grade}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <Badge variant="teal" className="text-xs opacity-80">{percentile}</Badge>
          <span className="text-xs text-cyan-ues mt-1 font-medium">{trendText}</span>
        </div>
      </CardContent>
    </Card>
  );
}
