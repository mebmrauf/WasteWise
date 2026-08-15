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
  const [downloading, setDownloading] = useState(false);
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

  const downloadPDF = async () => {
    try {
      setDownloading(true);
      if (!(window as any).html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const element = document.getElementById("certificate-content");
      const opt = {
        margin: 0,
        filename: `Sustainability_Certificate_${data?.businessName?.replace(/\s+/g, '_') || 'Business'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await (window as any).html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 py-10 px-4 flex flex-col items-center font-sans">
      
      {/* Controls (Hidden when printing) */}
      <div className="w-full max-w-[794px] flex justify-between items-center mb-6 print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Rewards
        </Button>
        <div className="flex items-center gap-3">
          <Button onClick={() => window.print()} className="gap-2 bg-neutral-600 hover:bg-neutral-700">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={downloadPDF} disabled={downloading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Certificate Container */}
      <div id="certificate-content" className="certificate-container relative bg-white w-full max-w-[794px] aspect-[1/1.414] shadow-2xl overflow-hidden print:shadow-none print:m-0 print:p-0 mx-auto">
        
        {/* Background Design elements */}
        <div className="absolute inset-0 border-8 border-emerald-800 m-4 rounded-sm pointer-events-none z-10" />
        <div className="absolute inset-0 border border-emerald-800 m-[22px] pointer-events-none z-10" />
        
        {/* Subtle Watermark/Background glow */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-50 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
        
        <div className="relative z-20 flex flex-col items-center justify-between h-full px-8 py-12 md:px-16 text-center">
          
          {/* Header */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center shadow-md">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-widest text-emerald-900 uppercase">
                WasteWise
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl">
            <h1 className="text-4xl md:text-5xl leading-tight font-serif text-emerald-950 mb-4 tracking-wider uppercase font-bold">
              Certificate of Sustainability
            </h1>
            <p className="text-sm md:text-base text-emerald-800/80 uppercase tracking-[0.3em] font-medium mb-6">
              Proudly Presented To
            </p>

            {/* Recipient */}
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6 capitalize font-serif border-b-[3px] border-emerald-700 pb-3 px-8 md:px-12 inline-block">
              {data.businessName}
            </h2>

            <p className="text-base md:text-lg text-neutral-700 max-w-xl leading-relaxed mb-8 font-medium">
              In recognition of outstanding commitment to environmental sustainability and responsible waste management. 
              By reaching the <strong className="text-emerald-800">{data.membershipLevel}</strong> tier and earning <strong className="text-emerald-800">{data.totalPoints.toLocaleString()}</strong> Green Points, 
              your organization has demonstrated exemplary leadership in corporate social responsibility.
            </p>

            {/* Impact Stats */}
            <div className="grid grid-cols-3 gap-4 w-full border-t border-b border-emerald-100 py-5 bg-white/50">
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-bold text-emerald-800 mb-1 font-serif">{data.impact?.totalWasteRecycledKg.toLocaleString() || "0"} kg</span>
                <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Waste Recycled</span>
              </div>
              <div className="flex flex-col items-center border-l border-r border-emerald-100">
                <span className="text-2xl md:text-3xl font-bold text-emerald-800 mb-1 font-serif">{data.impact?.totalCo2ReducedKg.toLocaleString() || "0"} kg</span>
                <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest">Estimated CO₂ Saved</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl md:text-3xl font-bold text-emerald-800 mb-1 font-serif">{data.impact?.totalTreesSaved.toLocaleString() || "0"}</span>
                <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-widest">Trees Equivalent</span>
              </div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between w-full mt-6 items-end px-2 md:px-8">
            <div className="flex flex-col items-center">
              <div className="w-24 md:w-32 border-b border-neutral-400 mb-2"></div>
              <span className="text-[9px] md:text-[10px] font-bold text-neutral-800 uppercase tracking-[0.1em]">Date of Issuance</span>
              <span className="text-xs text-neutral-600 font-serif mt-1">{data.dateUnlocked}</span>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-[3px] border-amber-600 flex items-center justify-center bg-white shadow-[0_0_15px_rgba(217,119,6,0.2)]">
                <div className="w-16 h-16 rounded-full border border-amber-600 border-dashed flex flex-col items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600 mb-0.5" />
                  <span className="text-[8px] font-bold text-amber-700 uppercase tracking-widest">{data.membershipLevel}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 md:w-32 border-b border-neutral-400 mb-2 text-center pb-1 text-lg font-serif text-emerald-900 italic signature-font">
                WasteWise
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-neutral-800 uppercase tracking-[0.1em]">Authorized Signature</span>
              <span className="text-xs text-neutral-600 font-serif mt-1">Official Representative</span>
            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body * { 
            visibility: hidden;
          }
          #certificate-content, #certificate-content * {
            visibility: visible;
          }
          body {
            background-color: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          #certificate-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            max-height: none !important;
            aspect-ratio: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid;
            page-break-before: avoid;
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}
