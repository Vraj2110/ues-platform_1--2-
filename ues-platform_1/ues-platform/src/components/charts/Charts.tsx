"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TIME_SERIES, SCORE_BANDS, PLATFORM_DISTRIBUTION } from "@/lib/data";

// ─── UES Area Chart ────────────────────────────────────────────────────────

export function UESTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={TIME_SERIES} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="uesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ECDC4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
        <YAxis domain={[60, 100]} tickLine={false} axisLine={false} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="ues"
          stroke="#4ECDC4"
          strokeWidth={2.5}
          fill="url(#uesGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#4ECDC4", stroke: "#0f3238", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Multi-platform Line Chart ────────────────────────────────────────────

export function PlatformTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={TIME_SERIES} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ytGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ECDC4" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#4ECDC4" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1877F2" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#1877F2" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
        <YAxis domain={[55, 100]} tickLine={false} axisLine={false} />
        <Tooltip />
        <Area type="monotone" dataKey="instagram" stroke="#FF6B6B" strokeWidth={2} fill="url(#igGrad)" dot={false} name="Instagram" />
        <Area type="monotone" dataKey="youtube" stroke="#4ECDC4" strokeWidth={1.5} fill="none" dot={false} name="YouTube" />
        <Area type="monotone" dataKey="facebook" stroke="#1877F2" strokeWidth={1.5} fill="url(#fbGrad)" dot={false} name="Facebook" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Score Band Bar Chart ─────────────────────────────────────────────────

export function ScoreBandChart({ data }: { data?: any[] }) {
  const chartData = data || SCORE_BANDS;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgba(78,205,196,0.05)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Platform Distribution Pie ────────────────────────────────────────────

export function PlatformPieChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={PLATFORM_DISTRIBUTION}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="count"
          nameKey="platform"
        >
          {PLATFORM_DISTRIBUTION.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [`${value} posts`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Platform Bar Comparison ──────────────────────────────────────────────

export function PlatformBarChart({ data = [] }: { data?: { name: string; score: number; fill: string }[] }) {
  const chartData = data.length > 0 ? data : [
    { name: "Instagram", score: 0, fill: "#FF6B6B" },
    { name: "YouTube", score: 0, fill: "#4ECDC4" },
    { name: "Facebook", score: 0, fill: "#1877F2" },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgba(78,205,196,0.05)" }} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Gauge Chart ──────────────────────────────────────────────────────────

export function UESGaugeChart({ score }: { score: number }) {
  const data = [
    { name: "Score", value: score, fill: "#4ECDC4" },
    { name: "Remaining", value: 100 - score, fill: "rgba(78,205,196,0.15)" },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="70%"
          startAngle={180}
          endAngle={0}
          innerRadius="75%"
          outerRadius="100%"
          paddingAngle={0}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
