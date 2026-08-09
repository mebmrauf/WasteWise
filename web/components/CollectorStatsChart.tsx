"use client";

import * as React from "react";
import { Card } from "@/components/Card";
import { getMyStats, type CollectorCategoryStat, type CollectorDailyStat } from "@/lib/api/users";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { format } from "date-fns";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"];

export function CollectorStatsChart() {
  const [dailyStats, setDailyStats] = React.useState<CollectorDailyStat[]>([]);
  const [categoryStats, setCategoryStats] = React.useState<CollectorCategoryStat[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    getMyStats()
      .then((res) => {
        if (!cancelled) {
          setDailyStats(res.dailyStats);
          setCategoryStats(res.categoryStats);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-80 flex items-center justify-center bg-neutral-50 animate-pulse">
          <p className="text-body-sm text-neutral-400">Loading charts...</p>
        </Card>
        <Card className="h-80 flex items-center justify-center bg-neutral-50 animate-pulse">
          <p className="text-body-sm text-neutral-400">Loading charts...</p>
        </Card>
      </div>
    );
  }

  // If there's absolutely no data, we could show a fallback.
  // But let's show the empty 7-day chart anyway to encourage them.
  const hasCategoryData = categoryStats.some((c) => c.weight > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 7-Day Collection Bar Chart */}
      <Card className="p-6 flex flex-col h-96">
        <h3 className="text-h4 text-neutral-900 mb-6">Waste Collected (Last 7 Days)</h3>
        <div className="flex-1 w-full h-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyStats}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(dateStr) => format(new Date(dateStr), "EEE")}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#737373", fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#737373", fontSize: 12 }}
                tickFormatter={(value) => `${value}kg`}
              />
              <Tooltip 
                cursor={{ fill: "#f5f5f5" }}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                labelFormatter={(label) => format(new Date(label as string), "MMM d, yyyy")}
                formatter={(value: number) => [`${value.toFixed(1)} kg`, "Collected"]}
              />
              <Bar 
                dataKey="weight" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Category Bar Chart */}
      <Card className="p-6 flex flex-col h-96">
        <h3 className="text-h4 text-neutral-900 mb-6">Waste by Category (All Time)</h3>
        <div className="flex-1 w-full h-full min-h-[250px]">
          {hasCategoryData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryStats}
                margin={{ top: 5, right: 10, left: -20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis 
                  dataKey="category" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#737373", fontSize: 11, angle: -45, textAnchor: 'end' }}
                  dy={15}
                  dx={-5}
                  interval={0}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#737373", fontSize: 12 }}
                  tickFormatter={(value) => `${value}kg`}
                />
                <Tooltip 
                  cursor={{ fill: "#f5f5f5" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => [`${value.toFixed(1)} kg`, "Total Weight"]}
                />
                <Bar 
                  dataKey="weight" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  {categoryStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-8">
              <p className="text-body text-neutral-500">No waste categories collected yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
