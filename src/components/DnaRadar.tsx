"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { DIMS } from "@/lib/data";
import type { DNA } from "@/lib/types";

export function DnaRadar({ dna, compare, height = 280 }: { dna: DNA; compare?: DNA; height?: number }) {
  const data = DIMS.map((d) => ({ dim: d.label, you: dna[d.key], campus: compare?.[d.key] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="74%">
        <defs>
          <linearGradient id="dnaFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b5651d" stopOpacity={0.75} />
            <stop offset="60%" stopColor="#8b3a3a" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#5c3a21" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <PolarGrid stroke="rgba(92,58,33,0.12)" />
        <PolarAngleAxis dataKey="dim" tick={{ fill: "#5c4033", fontSize: 12, fontWeight: 600 }} />
        {compare && <Radar dataKey="campus" stroke="#8a6f58" strokeDasharray="4 4" fill="transparent" isAnimationActive={false} />}
        <Radar dataKey="you" stroke="#8b3a3a" strokeWidth={2} fill="url(#dnaFill)" fillOpacity={0.55} animationDuration={900} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
