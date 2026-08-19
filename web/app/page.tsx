import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { PageContainer } from "@/components/PageContainer";
import {
  Truck,
  Camera,
  MapPin,
  ShieldCheck,
  Gift,
  Route,
  ClipboardList,
  CheckCircle2,
  FileText,
  ThumbsUp,
  ArrowRight,
} from "lucide-react";
import { HowItWorks } from "@/components/HowItWorks";
import { ScrollAnimation, ScrollAnimationChild } from "@/components/animations/ScrollAnimation";
import { FeaturesSection } from "@/components/FeaturesSection";
import { BusinessSection } from "@/components/BusinessSection";
import { ImpactSection } from "@/components/ImpactSection";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (token) {
    try {
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString());
        if (payload.role === "COLLECTOR") {
          redirect("/collector");
        } else if (payload.role === "ADMIN") {
          redirect("/admin");
        } else if (payload.role === "RECYCLING_COMPANY") {
          redirect("/recycling/dashboard");
        } else {
          redirect("/dashboard");
        }
      }
    } catch {
      // Ignore parse errors, just show the landing page
    }
  }

  return (
    <>
      <NavBar
        brand={
          <div className="flex flex-col">
            <span className="font-heading text-h4 text-neutral-900 leading-none">WasteWise</span>
          </div>
        }
        links={[
          { label: "Home", href: "#home" },
          { label: "Solutions", href: "/solutions" },
          { label: "For Businesses", href: "/for-businesses" },
          { label: "About", href: "/about" },
        ]}
        actions={<NavAuthActions />}
      />

      <main className="flex flex-col min-h-screen">
        {/* HERO SECTION */}
        <section id="home" className="relative bg-[#F4F5F0] py-8 md:py-12 lg:py-16 overflow-hidden">
          {/* Subtle Ambient Gradients */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-[#114E29]/10 to-transparent rounded-full blur-[100px] -translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-600/5 to-transparent rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
          
          <ScrollAnimation type="fade-up">
            <PageContainer className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center px-6 md:px-12 lg:px-16 max-w-7xl mx-auto">
              <div className="flex flex-col max-w-[500px]">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-md text-[#114E29] text-body-sm font-medium mb-8 w-max border border-[#114E29]/10 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Now available in Dhaka
              </div>
              
              {/* Headline */}
              <h1 className="text-[32px] md:text-[40px] lg:text-[48px] font-extrabold text-[#1A2E22] mb-5 tracking-tight leading-[1.1] max-w-[480px]">
                Transforming Waste into <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#114E29] to-emerald-600 relative inline-block">Value</span>
              </h1>
              
              {/* Description */}
              <p className="text-[16px] text-[#4B6358] mb-8 leading-[1.6] max-w-[440px]">
                WasteWise brings the informal scrap collection network online. Post a pickup request, track verified collectors in real-time, and earn Green Points for doing your part.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" href="/signup" className="bg-[#114E29] hover:bg-[#0A3019] text-white rounded-full px-8 h-[52px] text-[16px] transition-all hover:-translate-y-0.5 border-none shadow-[0_8px_20px_rgb(17,78,41,0.2)]">
                  Request a pickup
                </Button>
                <Button size="lg" variant="secondary" href="/signup?role=collector" className="rounded-full px-8 h-[52px] border-stone-200 text-[#114E29] text-[16px] transition-all hover:-translate-y-0.5 bg-white hover:bg-stone-50 shadow-sm">
                  Join as a collector
                </Button>
              </div>
              
              {/* Trust Badges below CTA */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-6 border-t border-[#114E29]/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={20} />
                  <span className="text-[13px] font-medium text-[#4B6358]">Verified Collectors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={20} />
                  <span className="text-[13px] font-medium text-[#4B6358]">Secure Transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="text-emerald-600" size={20} />
                  <span className="text-[13px] font-medium text-[#4B6358]">Green Rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="text-emerald-600" size={20} />
                  <span className="text-[13px] font-medium text-[#4B6358]">Real-Time Tracking</span>
                </div>
              </div>
            </div>

            <div className="relative lg:w-4/5 lg:ml-auto">
              <div className="relative rounded-[24px] overflow-hidden shadow-[0_20px_40px_rgb(17,78,41,0.08)] border border-stone-200/50 aspect-[4/3] bg-stone-100 flex items-center justify-center group animate-float">
                <Image
                  src="/images/hero.png"
                  alt="WasteWise Smart Logistics"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-[#114E29]/5 mix-blend-overlay"></div>
              </div>
              {/* Floating badges */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md p-4 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/20 flex items-center gap-4 z-20 animate-fade-in-up">
                <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#114E29]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-[#4B6358] uppercase">Security</p>
                  <p className="text-[14px] font-bold text-[#1A2E22]">Verified Collectors</p>
                </div>
              </div>
            </div>
          </PageContainer>
        </ScrollAnimation>
      </section>

      {/* HOW IT WORKS */}
        <HowItWorks />

        <FeaturesSection />

        {/* DUAL AUDIENCE SPLIT */}
        <BusinessSection />

        {/* IMPACT STATISTICS */}
        <div id="impact">
          <ImpactSection />
        </div>
      </main>

      {/* FINAL CTA */}
      <section className="py-8 md:py-12 lg:py-16 bg-gradient-to-br from-[#EAF0E6] to-[#DFEBE3] border-t border-[#114E29]/10">
        <PageContainer className="px-6 md:px-12 lg:px-16 max-w-4xl mx-auto text-center">
          <ScrollAnimation type="fade-up">
            <h2 className="text-[32px] md:text-[40px] font-bold text-neutral-900 mb-6">Ready to make an impact?</h2>
            <p className="text-neutral-600 mb-10 text-[18px]">
              Join the WasteWise ecosystem today and help us build a cleaner, greener Bangladesh.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button href="/signup" className="bg-[#114E29] hover:bg-green-800 text-white rounded-full px-8 h-[52px]">
                Get Started for Free
              </Button>
            </div>
          </ScrollAnimation>
        </PageContainer>
      </section>

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
