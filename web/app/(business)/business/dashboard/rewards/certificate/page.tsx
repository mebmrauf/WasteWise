"use client";

import React, { useEffect, useState } from "react";
import { getRewardsBalance } from "@/lib/api/rewards";
import { getCurrentUser } from "@/lib/api/auth";
import { Loader2, Printer, ArrowLeft, Leaf, Award } from "lucide-react";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";

export default function CertificatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    businessName: string;
    totalPoints: number;
    membershipLevel: string;
    dateUnlocked: string;
    impact: { totalWasteRecycledKg: number; totalCo2ReducedKg: number; totalTreesSaved: number } | null;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [user, balance] = await Promise.all([
          getCurrentUser(),
          getRewardsBalance()
        ]);
        
        setData({
          businessName: user?.fullName || "Business Member",
          totalPoints: balance.totalGreenPoints,
          membershipLevel: balance.membershipLevel,
          dateUnlocked: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          impact: balance.environmentalImpact || { totalWasteRecycledKg: 0, totalCo2ReducedKg: 0, totalTreesSaved: 0 }
        });
      } catch (err) {
        console.error("Failed to load certificate data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data || (data.membershipLevel !== "GOLD" && data.membershipLevel !== "PLATINUM")) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-neutral-100 p-6">
        <p className="text-h3 text-neutral-900 mb-4">Certificate Not Available</p>
        <p className="text-body text-neutral-600 mb-6">You need to reach the Gold or Platinum tier to unlock your Sustainability Certificate.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 py-10 px-4 flex flex-col items-center font-sans">
      
      {/* Controls (Hidden when printing) */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Rewards
        </Button>
        <Button onClick={() => window.print()} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* Certificate Container */}
      <div className="relative bg-white w-full max-w-[1122px] aspect-[1.414/1] shadow-2xl overflow-hidden print:shadow-none print:m-0 print:p-0">
        
        {/* Background Design elements */}
        <div className="absolute inset-0 border-8 border-emerald-800 m-6 rounded-sm pointer-events-none z-10" />
        <div className="absolute inset-0 border border-emerald-800 m-[30px] pointer-events-none z-10" />
        
        {/* Subtle Watermark/Background glow */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-50 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        
        <div className="relative z-20 flex flex-col items-center justify-between h-full px-20 py-16 text-center">
          
          {/* Header */}
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-700 flex items-center justify-center shadow-md">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-widest text-emerald-900 uppercase">
                WasteWise
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-4xl">
            <h1 className="text-[3.5rem] leading-none font-serif text-emerald-950 mb-6 tracking-wider uppercase font-bold">
              Certificate of Sustainability
            </h1>
            <p className="text-lg text-emerald-800/80 uppercase tracking-[0.3em] font-medium mb-10">
              Proudly Presented To
            </p>

            {/* Recipient */}
            <h2 className="text-5xl font-bold text-neutral-900 mb-8 capitalize font-serif border-b-[3px] border-emerald-700 pb-4 px-16 inline-block">
              {data.businessName}
            </h2>

            <p className="text-xl text-neutral-700 max-w-3xl leading-relaxed mb-12 font-medium">
              In recognition of outstanding commitment to environmental sustainability and responsible waste management. 
              By reaching the <strong className="text-emerald-800">{data.membershipLevel}</strong> tier and earning <strong className="text-emerald-800">{data.totalPoints.toLocaleString()}</strong> Green Points, 
              your organization has demonstrated exemplary leadership in corporate social responsibility.
            </p>

            {/* Impact Stats */}
            <div className="grid grid-cols-3 gap-8 w-full border-t border-b border-emerald-100 py-6 bg-white/50">
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold text-emerald-800 mb-1 font-serif">{data.impact?.totalWasteRecycledKg.toLocaleString() || "0"} kg</span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Waste Recycled</span>
              </div>
              <div className="flex flex-col items-center border-l border-r border-emerald-100">
                <span className="text-4xl font-bold text-emerald-800 mb-1 font-serif">{data.impact?.totalCo2ReducedKg.toLocaleString() || "0"} kg</span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Estimated CO₂ Saved</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold text-emerald-800 mb-1 font-serif">{data.impact?.totalTreesSaved.toLocaleString() || "0"}</span>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Trees Equivalent</span>
              </div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between w-full max-w-4xl mt-4 items-end">
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-neutral-400 mb-3"></div>
              <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-[0.2em]">Date of Issuance</span>
              <span className="text-sm text-neutral-600 font-serif mt-1">{data.dateUnlocked}</span>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-[3px] border-amber-600 flex items-center justify-center bg-white shadow-[0_0_15px_rgba(217,119,6,0.2)]">
                <div className="w-20 h-20 rounded-full border border-amber-600 border-dashed flex flex-col items-center justify-center">
                  <Award className="w-7 h-7 text-amber-600 mb-1" />
                  <span className="text-[8px] font-bold text-amber-700 uppercase tracking-widest">{data.membershipLevel}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-neutral-400 mb-3 text-center pb-1 text-2xl font-serif text-emerald-900 italic signature-font">
                WasteWise
              </div>
              <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-[0.2em]">Authorized Signature</span>
              <span className="text-sm text-neutral-600 font-serif mt-1">Official Representative</span>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { 
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            background-color: white !important;
          }
        }
      `}} />
    </div>
  );
}
