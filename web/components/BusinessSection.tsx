"use client";

import React from "react";
import { CheckCircle2, Route, ClipboardList, Building2, Factory, ArrowRight } from "lucide-react";
import { ScrollAnimation } from "@/components/animations/ScrollAnimation";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/Button";

export function BusinessSection() {
  return (
    <section id="business" className="py-8 md:py-12 lg:py-16 bg-gradient-to-b from-[#EDF2E8] via-[#DFEBE3] to-[#D1E0D7] border-t border-[#114E29]/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-[#114E29]/5 to-transparent rounded-bl-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-tr-full blur-[80px] pointer-events-none" />
      
      <PageContainer className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto relative z-10">
        <ScrollAnimation type="fade-up" className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* BUSINESS OVERVIEW */}
          <div className="bg-gradient-to-br from-[#F0FDF4] to-white rounded-[20px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-emerald-500/20 transition-all duration-300 hover:shadow-[0_12px_40px_rgb(16,185,129,0.08)] group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h2 className="text-[28px] font-bold text-[#1A2E22] mb-4 tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Building2 size={24} />
                </div>
                For Businesses
              </h2>
              <p className="text-[#4B6358] mb-8 leading-relaxed text-[15px]">
                Manage bulk waste efficiently, track your environmental impact, and contribute to CSR initiatives through our premium B2B marketplace.
              </p>
            <ul className="space-y-4 mb-10">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-[#114E29] shrink-0 mt-0.5" size={18} />
                <span className="text-[#3F544A] text-[14px] font-medium">Competitive Bidding for Bulk Waste</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-[#114E29] shrink-0 mt-0.5" size={18} />
                <span className="text-[#3F544A] text-[14px] font-medium">Automated Sustainability Reports</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-[#114E29] shrink-0 mt-0.5" size={18} />
                <span className="text-[#3F544A] text-[14px] font-medium">Verified Recycling Partners</span>
              </li>
            </ul>
            <Button 
              href="/for-businesses"
              className="w-full sm:w-auto bg-[#114E29] hover:bg-[#0A3019] text-white h-[44px] px-6 text-[14px] font-bold border-none transition-transform hover:-translate-y-0.5 shadow-[0_8px_20px_rgb(17,78,41,0.15)] flex items-center justify-center gap-2"
            >
              Explore Business Solutions <ArrowRight size={16} />
            </Button>
            </div>
          </div>

          {/* SCRAP COLLECTORS */}
          <div className="bg-gradient-to-br from-[#F8FAF9] to-white rounded-[20px] p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(16,185,129,0.06)] border border-emerald-500/10 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h2 className="text-[28px] font-bold text-[#1A2E22] mb-4 tracking-tight flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Factory size={24} />
                </div>
                For Scrap Collectors
              </h2>
              <p className="text-[#4B6358] mb-8 leading-relaxed text-[15px]">
                Stop wandering streets hoping for scrap. Turn your daily foot traffic into a formal, structured business with guaranteed pickups.
              </p>
              <ul className="space-y-6 mb-10">
                <li className="flex items-start gap-4">
                  <Route className="text-emerald-600 shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-[#1A2E22] text-[15px]">Route Optimization</h4>
                    <p className="text-[#4B6358] text-[13px] mt-1">We sequence your daily jobs into one optimized map route.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <ClipboardList className="text-emerald-600 shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-bold text-[#1A2E22] text-[15px]">Income Dashboard</h4>
                    <p className="text-[#4B6358] text-[13px] mt-1">Build a provable income history to show banks and landlords.</p>
                  </div>
                </li>
              </ul>
              <Button href="/solutions" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white h-[44px] px-6 text-[14px] font-bold border-none transition-transform hover:-translate-y-0.5 shadow-[0_8px_20px_rgb(16,185,129,0.2)] flex items-center justify-center gap-2">
                Explore Collector Solutions <ArrowRight size={16} />
              </Button>
            </div>
          </div>

        </ScrollAnimation>
      </PageContainer>
    </section>
  );
}
