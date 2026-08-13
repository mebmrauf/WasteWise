"use client";

import * as React from "react";
import { Card } from "@/components/Card";
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

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4"];

export function CompanyStatsChart({
  performanceChart
}: {
  performanceChart: { month: string, count: number }[]
}) {
  const hasData = performanceChart.some((c) => c.count > 0);

  return (
    <Card className="glass-panel p-6 flex flex-col h-[400px] border-0 shadow-lg rounded-2xl md:col-span-2 lg:col-span-2">
      <h3 className="text-h4 text-neutral-900 mb-6 font-heading">Completed Collections (Last 6 Months)</h3>
      <div className="flex-1 w-full h-full min-h-[250px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={performanceChart}
              margin={{ top: 5, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#737373", fontSize: 12 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#737373", fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                cursor={{ fill: "#f5f5f5" }}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                formatter={(value: any) => [`${Number(value || 0)} Collections`, "Completed"]}
              />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              >
                {performanceChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center pb-8">
            <p className="text-body text-neutral-500">No collections completed in the last 6 months.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
