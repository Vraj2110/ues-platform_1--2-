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
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
        <YAxis domain={[55, 100]} tickLine={false} axisLine={false} />
        <Tooltip />
        <Area type="monotone" dataKey="instagram" stroke="#FF6B6B" strokeWidth={2} fill="url(#igGrad)" dot={false} name="Instagram" />
        <Area type="monotone" dataKey="youtube" stroke="#4ECDC4" strokeWidth={1.5} fill="none" dot={false} name="YouTube" />
        <Area type="monotone" dataKey="x" stroke="rgba(247,255,247,0.5)" strokeWidth={1.5} fill="none" dot={false} name="X / Twitter" />
        <Area type="monotone" dataKey="linkedin" stroke="rgba(78,205,196,0.6)" strokeWidth={1.5} fill="none" dot={false} name="LinkedIn" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Score Band Bar Chart ─────────────────────────────────────────────────

export function ScoreBandChart() {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={SCORE_BANDS} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="range" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgba(78,205,196,0.05)" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {SCORE_BANDS.map((entry, index) => (
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

const PLATFORM_BAR_DATA = [
  { name: "Instagram", score: 82, fill: "#FF6B6B" },
  { name: "YouTube", score: 91, fill: "#4ECDC4" },
  { name: "X / Twitter", score: 74, fill: "rgba(247,255,247,0.5)" },
  { name: "LinkedIn", score: 88, fill: "rgba(78,205,196,0.7)" },
];

export function PlatformBarChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={PLATFORM_BAR_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "rgba(78,205,196,0.05)" }} />
        <Bar dataKey="score" radius={[6, 6, 0, 0]}>
          {PLATFORM_BAR_DATA.map((entry, index) => (
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
