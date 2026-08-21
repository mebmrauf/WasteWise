"use client";

import React, { useState } from "react";
import { Camera, ShieldCheck, Gift, MapPin, ChevronDown } from "lucide-react";
import { ScrollAnimation, ScrollAnimationChild } from "@/components/animations/ScrollAnimation";
import { PageContainer } from "@/components/PageContainer";
import { motion, AnimatePresence } from "framer-motion";

const featuresData = [
  {
    id: "ai-recognition",
    title: "AI Waste Recognition",
    shortDescription: "Point your camera to instantly identify recyclable materials using AI.",
    icon: Camera,
    fullDescription: "WasteWise uses AI-powered image recognition to identify different types of waste from uploaded photos. It automatically categorizes recyclable materials, estimates their value, provides recycling guidance, and helps users properly prepare waste before pickup. This makes recycling smarter, easier, and more accessible."
  },
  {
    id: "verified-network",
    title: "Verified Network",
    shortDescription: "Every collector passes ID and background checks for your safety.",
    icon: ShieldCheck,
    fullDescription: "WasteWise connects users with trusted and verified collectors and recycling companies. Every service provider goes through a verification process to ensure safety, reliability, and transparency. Users can confidently choose recycling partners based on ratings, experience, and service history."
  },
  {
    id: "green-rewards",
    title: "Green Rewards",
    shortDescription: "Earn points for every KG recycled and redeem them for rewards.",
    icon: Gift,
    fullDescription: "WasteWise encourages sustainable habits through its Green Rewards program. Users earn Green Points by completing recycling activities and verified pickups. These points can be redeemed for rewards while motivating individuals and communities to participate in sustainable waste management."
  },
  {
    id: "real-time-tracking",
    title: "Real-Time Tracking",
    shortDescription: "Follow your collector's exact location on a live map as they arrive.",
    icon: MapPin,
    fullDescription: "WasteWise provides live pickup tracking after a request is accepted. Users can monitor the collector's location, receive updates, reduce waiting time, and experience a more transparent and convenient recycling pickup process."
  }
];

export function FeaturesSection() {
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);

  const toggleFeature = (id: string) => {
    setExpandedFeatureId(expandedFeatureId === id ? null : id);
  };

  return (
    <section id="features" className="py-12 md:py-16 lg:py-20 bg-gradient-to-b from-[#F5F4EF] via-[#EAF0E6] to-[#E2EAE5] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>
      <PageContainer className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto">
        <ScrollAnimation type="fade-up" className="mb-10">
          <h2 className="text-h2 text-neutral-900 mb-4">Built for Trust & Efficiency</h2>
          <p className="text-body-lg text-neutral-600 max-w-2xl">
            We've combined modern logistics tech with the existing collector network to create a seamless experience.
          </p>
        </ScrollAnimation>

        <ScrollAnimation type="fade-up" staggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {featuresData.map((feature) => {
            const isExpanded = expandedFeatureId === feature.id;

            return (
              <ScrollAnimationChild 
                key={feature.id} 
                className={`group flex flex-col bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-neutral-200/60 transition-all duration-300 relative overflow-hidden cursor-pointer hover:-translate-y-1 ${isExpanded ? 'shadow-lg border-[#114E29]/30 ring-1 ring-[#114E29]/10' : 'hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20'}`}
                onClick={() => toggleFeature(feature.id)}
                aria-expanded={isExpanded}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-50 to-transparent -z-10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-100 text-neutral-700 flex items-center justify-center mb-6 group-hover:scale-105 group-hover:bg-[#114E29] group-hover:text-white group-hover:border-[#114E29] transition-all duration-300 shadow-sm">
                  <feature.icon size={20} strokeWidth={1.5} />
                </div>
                
                <h3 className="text-[18px] lg:text-[20px] font-bold text-neutral-900 mb-2 group-hover:text-[#114E29] transition-colors duration-300">
                  {feature.title}
                </h3>
                
                <p className="text-neutral-600 text-[14px] leading-relaxed mb-6 flex-grow">
                  {feature.shortDescription}
                </p>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 border-t border-neutral-100">
                        <p className="text-neutral-700 text-[14px] leading-relaxed">
                          {feature.fullDescription}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  className="flex items-center text-[#114E29] font-semibold text-[13px] mt-6 transition-all duration-300 focus:outline-none"
                  aria-label={`Learn more about ${feature.title}`}
                >
                  {isExpanded ? "Show less" : "Learn more"} 
                  <ChevronDown size={16} className={`ml-1.5 transition-transform duration-300 ${isExpanded ? "rotate-180" : "group-hover:translate-y-0.5"}`} />
                </button>
              </ScrollAnimationChild>
            );
          })}
        </ScrollAnimation>
      </PageContainer>
    </section>
  );
}
