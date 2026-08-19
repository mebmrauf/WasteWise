"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";
import { publicEnv } from "@/lib/env";
import { PageContainer } from "@/components/PageContainer";
import { Recycle, Truck, Users, Leaf } from "lucide-react";

interface LandingStats {
  totalWasteRecycled: number;
  completedPickups: number;
  verifiedCollectors: number;
  recyclingCompanies: number;
  co2Reduced: number;
}

const BASELINE_STATS: LandingStats = {
  totalWasteRecycled: 15400,
  completedPickups: 850,
  verifiedCollectors: 42,
  recyclingCompanies: 12,
  co2Reduced: 18480,
};

function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: "-50px" });

  useEffect(() => {
    if (inView) {
      const controls = animate(0, value, {
        duration,
        ease: "easeOut",
        onUpdate(v) {
          setCount(Math.floor(v));
        },
      });
      return () => controls.stop();
    }
  }, [value, inView, duration]);

  return <span ref={nodeRef}>{count.toLocaleString()}</span>;
}

export function ImpactSection() {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`${publicEnv.NEXT_PUBLIC_API_URL}/landing/stats`);
        if (!res.ok) throw new Error("Failed to fetch stats");
        const json = await res.json();
        
        // Ensure values are numbers and fallback if missing
        setStats({
          totalWasteRecycled: Number(json.data.totalWasteRecycled) || BASELINE_STATS.totalWasteRecycled,
          completedPickups: Number(json.data.completedPickups) || BASELINE_STATS.completedPickups,
          verifiedCollectors: Number(json.data.verifiedCollectors) || BASELINE_STATS.verifiedCollectors,
          recyclingCompanies: Number(json.data.recyclingCompanies) || BASELINE_STATS.recyclingCompanies,
          co2Reduced: Number(json.data.co2Reduced) || BASELINE_STATS.co2Reduced,
        });
      } catch (err) {
        console.error("Failed to load impact stats:", err);
        setStats(BASELINE_STATS);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading || !stats) {
    // Show skeleton/loading state
    return (
      <section className="py-8 md:py-12 lg:py-16 bg-gradient-to-br from-[#F4F5F0] to-[#EAF0E6] relative overflow-hidden border-y border-neutral-100">
        <PageContainer className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-10 md:mb-12 opacity-50 animate-pulse">
            <div className="h-10 w-64 bg-neutral-200 rounded-lg mx-auto mb-4" />
            <div className="h-4 w-96 bg-neutral-200 rounded mx-auto" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 opacity-50 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-[20px] border border-[#114E29]/10 p-6 h-[140px]" />
            ))}
          </div>
        </PageContainer>
      </section>
    );
  }

  const partners = stats.verifiedCollectors + stats.recyclingCompanies;

  const statCards = [
    {
      title: "Kg Waste Recycled",
      value: stats.totalWasteRecycled,
      icon: <Recycle size={24} className="text-emerald-600" />,
      suffix: "+",
    },
    {
      title: "Successful Pickups",
      value: stats.completedPickups,
      icon: <Truck size={24} className="text-emerald-600" />,
      suffix: "+",
    },
    {
      title: "Verified Partners",
      value: partners,
      icon: <Users size={24} className="text-emerald-600" />,
      suffix: "+",
    },
    {
      title: "Kg CO₂ Reduced",
      value: stats.co2Reduced,
      icon: <Leaf size={24} className="text-emerald-600" />,
      suffix: "",
    },
  ];

  return (
    <section className="py-8 md:py-12 lg:py-16 bg-gradient-to-br from-[#F4F5F0] to-[#EAF0E6] relative overflow-hidden border-y border-neutral-100">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-[#114E29]/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-50%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <PageContainer className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-[28px] md:text-[36px] font-bold text-[#1A2E22] mb-3 tracking-tight">Our Measurable Impact</h2>
          <p className="text-[#4B6358] text-[15px] max-w-2xl mx-auto leading-relaxed">
            Together, we are transforming waste management in Bangladesh through a verified, transparent, and rapidly growing ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white rounded-[20px] p-6 border border-[#114E29]/10 flex flex-col items-center text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:-translate-y-1 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                {stat.icon}
              </div>
              <div className="text-[32px] md:text-[40px] font-bold text-[#1A2E22] mb-1 flex items-center justify-center tracking-tight leading-none group-hover:text-[#114E29] transition-colors">
                <AnimatedCounter value={stat.value} />
                <span className="text-emerald-500 text-[24px] md:text-[28px] ml-1">{stat.suffix}</span>
              </div>
              <div className="text-[13px] md:text-[14px] font-bold text-[#4B6358] tracking-wide uppercase">
                {stat.title}
              </div>
            </motion.div>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
