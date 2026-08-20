import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { PageContainer } from "@/components/PageContainer";
import { Leaf, Users, ShieldCheck, Target, Heart, Globe } from "lucide-react";

export default function AboutPage() {
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/solutions" },
    { label: "For Businesses", href: "/for-businesses" },
    { label: "About", href: "/about", active: true },
  ];

  return (
    <>
      <NavBar
        brand={
          <a href="/" className="flex flex-col">
            <span className="font-heading text-h4 text-neutral-900 leading-none">WasteWise</span>
          </a>
        }
        links={navLinks}
        actions={<NavAuthActions />}
      />

      <main className="flex flex-col min-h-screen bg-stone-50 pb-24">
        {/* HEADER SECTION */}
        <section className="relative bg-gradient-to-br from-[#EAF0E6] to-[#E2EEE8] py-12 md:py-16 lg:py-20 border-b border-neutral-200/50">
          <PageContainer className="flex flex-col items-center text-center max-w-3xl mx-auto px-6 md:px-12 lg:px-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-[#114E29] text-[13px] font-semibold mb-4 shadow-sm">
              Our Story
            </div>
            <h1 className="text-[28px] md:text-[36px] lg:text-[40px] font-bold text-neutral-900 mb-4 tracking-tight leading-[1.2]">
              Building a <span className="text-[#114E29]">Zero-Waste</span> Bangladesh
            </h1>
            <p className="text-[16px] md:text-[18px] text-neutral-600 leading-[1.6] max-w-xl mx-auto mb-2">
              WasteWise is transforming the way communities manage waste by bringing the entire recycling ecosystem onto one intelligent digital platform.
            </p>
          </PageContainer>
        </section>

        {/* MISSION & VISION */}
        <section className="py-12 md:py-16 lg:py-20 bg-[#F4F0E6] border-b border-neutral-100">
          <PageContainer className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              
              {/* Mission Card */}
              <div className="bg-gradient-to-br from-[#F8FAF9] to-white rounded-[24px] p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] border border-[#114E29]/10 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Target size={28} />
                </div>
                <h2 className="text-[24px] md:text-[28px] font-bold text-neutral-900 mb-3 tracking-tight">Our Mission</h2>
                <p className="text-neutral-600 text-[15px] md:text-[16px] leading-relaxed">
                  To formalize the scrap collection industry and empower individuals to seamlessly recycle their household and commercial waste. We connect individuals, local collectors, and massive recycling plants in a transparent digital marketplace.
                </p>
              </div>

              {/* Vision Card */}
              <div className="bg-gradient-to-br from-[#F0FDF4] to-white rounded-[24px] p-6 md:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(16,185,129,0.06)] border border-emerald-500/20 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Globe size={28} />
                </div>
                <h2 className="text-[24px] md:text-[28px] font-bold text-neutral-900 mb-3 tracking-tight">Our Vision</h2>
                <p className="text-neutral-600 text-[15px] md:text-[16px] leading-relaxed">
                  A sustainable future where waste is viewed as a valuable resource, not a burden. By establishing transparent logistics and smart tracking, we aim to prevent millions of tons of recyclable materials from ending up in landfills or polluting our ecosystems.
                </p>
              </div>

            </div>
          </PageContainer>
        </section>

        {/* GOALS & IMPACT */}
        <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-[#EAF0E6] to-[#DFEBE3] relative overflow-hidden border-t border-[#114E29]/10">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-[#114E29]/5 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-50%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[100px] rounded-full" />
          </div>
          <PageContainer className="px-6 md:px-12 lg:px-16 relative z-10 max-w-7xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-[28px] md:text-[36px] font-bold text-[#1A2E22] tracking-tight mb-3">
                Environmental & Community Goals
              </h2>
              <p className="text-[#4B6358] text-[15px] max-w-2xl mx-auto leading-relaxed">
                Technology is only a tool. Our ultimate metric for success is the positive impact we leave on the communities we serve.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-[20px] p-6 border border-[#114E29]/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:-translate-y-1 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                  <Leaf size={24} />
                </div>
                <h3 className="text-[18px] font-bold text-[#1A2E22] mb-2 group-hover:text-[#114E29] transition-colors">Reduce Carbon Emissions</h3>
                <p className="text-[#4B6358] leading-relaxed text-[14px]">
                  By optimizing collection routes and maximizing the volume of materials sent to recycling plants, we heavily reduce the CO₂ emissions associated with raw material extraction and inefficient transport.
                </p>
              </div>
              
              <div className="bg-white rounded-[20px] p-6 border border-[#114E29]/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:-translate-y-1 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                  <Heart size={24} />
                </div>
                <h3 className="text-[18px] font-bold text-[#1A2E22] mb-2 group-hover:text-[#114E29] transition-colors">Dignity for Collectors</h3>
                <p className="text-[#4B6358] leading-relaxed text-[14px]">
                  We provide marginalized scrap collectors with a provable digital income history, scheduled guaranteed pickups, and the professional dignity they deserve as frontline environmental workers.
                </p>
              </div>

              <div className="bg-white rounded-[20px] p-6 border border-[#114E29]/10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:-translate-y-1 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-[18px] font-bold text-[#1A2E22] mb-2 group-hover:text-[#114E29] transition-colors">Transparent Compliance</h3>
                <p className="text-[#4B6358] leading-relaxed text-[14px]">
                  We enable massive enterprises to easily track their generated waste, ensure it is processed by vetted partners, and contribute directly to local CSR sustainability initiatives.
                </p>
              </div>
            </div>
          </PageContainer>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white py-6 md:py-8 border-t border-neutral-200">
        <PageContainer className="px-6 md:px-12 lg:px-16 max-w-[800px] mx-auto flex flex-col items-center justify-center text-center gap-1.5">
          <span className="font-heading text-[18px] font-bold text-neutral-900 tracking-tight leading-none mb-1">WasteWise</span>
          <p className="text-[13px] text-neutral-500 leading-tight">
            Building a cleaner, greener, and smarter Bangladesh.
          </p>
          <p className="text-[12px] text-neutral-400 leading-tight mt-1">
            &copy; {new Date().getFullYear()} WasteWise. All rights reserved.
          </p>
        </PageContainer>
      </footer>
    </>
  );
}
