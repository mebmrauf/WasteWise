"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Card } from "./Card";

export interface ChartDataPoint {
  label: string;
  weight: number;
}

interface WasteSoldChartProps {
  areaData: ChartDataPoint[];
  barData: ChartDataPoint[];
  currentYear: string;
}

export function WasteSoldChart({ areaData, barData, currentYear }: WasteSoldChartProps) {
  const hasAreaData = areaData.length > 0;
  const hasBarData = barData.length > 0;

  if (!hasAreaData && !hasBarData) {
    return (
      <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white min-h-[300px] justify-center items-center mt-8">
        <p className="text-neutral-500">No recycled data available yet.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
      <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white">
        <div className="mb-4">
          <h3 className="text-h6 text-neutral-900">Total Recycled (Yearly)</h3>
          <p className="text-body-sm text-neutral-500">All-time recycling history by year.</p>
        </div>
        <div className="h-[250px] w-full">
          {hasAreaData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12, fill: "#737373" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: "#737373" }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip 
                  formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(1) : value} kg`, "Recycled"]}
                  labelStyle={{ color: "#171717", fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">No data for yearly chart</div>
          )}
        </div>
      </Card>

      <Card className="flex flex-col p-6 shadow-sm border border-neutral-200 bg-white">
        <div className="mb-4">
          <h3 className="text-h6 text-neutral-900">Total Recycled (Monthly - {currentYear})</h3>
          <p className="text-body-sm text-neutral-500">Recycling volume for the current year.</p>
        </div>
        <div className="h-[250px] w-full">
          {hasBarData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12, fill: "#737373" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: "#737373" }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `${val}kg`}
                />
                <Tooltip 
                  cursor={{ fill: '#f5f5f5' }}
                  formatter={(value: any) => [`${typeof value === 'number' ? value.toFixed(1) : value} kg`, "Recycled"]}
                  labelStyle={{ color: "#171717", fontWeight: 600 }}
                />
                <Bar dataKey="weight" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">No data for monthly chart</div>
          )}
        </div>
      </Card>
    </div>
  );
}
