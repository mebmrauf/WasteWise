import { Button } from "@/components/Button";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { PageContainer } from "@/components/PageContainer";
import { CheckCircle2, Factory, Truck } from "lucide-react";

export default function ForPartnersPage() {
  return (
    <>
      <NavBar
        brand={
          <a href="/" className="flex flex-col">
            <span className="font-heading text-h4 text-neutral-900 leading-none">WasteWise</span>
          </a>
        }
        links={[
          { label: "How It Works", href: "/#how-it-works" },
          { label: "Features", href: "/#features" },
          { label: "For Businesses", href: "/for-businesses" },
          { label: "For Partners", href: "/for-partners", active: true },
          { label: "About", href: "/#about" },
          { label: "Contact", href: "/#contact" },
        ]}
        actions={<NavAuthActions />}
      />

      <main className="flex flex-col min-h-screen bg-neutral-50 pb-24">
        {/* HEADER SECTION */}
        <section className="py-24 lg:py-32">
          <PageContainer className="flex flex-col items-center text-center max-w-3xl mx-auto px-6 md:px-12 lg:px-16">
            <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-bold text-neutral-900 mb-6 tracking-tight leading-[1.1]">
              Partner with <span className="text-[#114E29]">WasteWise</span>
            </h1>
            <p className="text-[18px] md:text-[20px] text-neutral-600 leading-8 max-w-[600px]">
              Join our network of verified collectors and recycling companies to formalize your waste management operations, increase your income, and streamline your workflow.
            </p>
          </PageContainer>
        </section>

        {/* CARDS SECTION */}
        <section className="pb-24 lg:pb-32">
          <PageContainer className="px-6 md:px-12 lg:px-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* Collector Card */}
              <div className="bg-white rounded-[24px] p-10 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-200/60 flex flex-col relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-110" />
                
                <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center mb-8">
                  <Truck size={32} />
                </div>
                
                <h2 className="text-h2 text-neutral-900 mb-4">Independent Collector</h2>
                <p className="text-body-lg text-neutral-600 mb-8">
                  Turn your daily foot traffic into a formal, structured business with optimized routes and digital tracking.
                </p>
                
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                    <span className="text-neutral-700">Accept Smart Pickup requests</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                    <span className="text-neutral-700">Verify weights and categories digitally</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                    <span className="text-neutral-700">Earn consistent income</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
                    <span className="text-neutral-700">Manage assigned pickups effortlessly</span>
                  </li>
                </ul>
                
                <Button size="lg" href="/signup?role=collector" className="w-full bg-[#114E29] hover:bg-green-800 text-white rounded-[12px] h-[52px] text-[16px] transition-transform hover:-translate-y-0.5 border-none shadow-sm">
                  Join as Collector
                </Button>
              </div>

              {/* Recycling Company Card */}
              <div className="bg-neutral-900 rounded-[24px] p-10 md:p-12 shadow-2xl flex flex-col relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-8">
                    <Factory size={32} />
                  </div>
                  
                  <h2 className="text-h2 text-white mb-4">Recycling Company</h2>
                  <p className="text-body-lg text-white/70 mb-8">
                    Access a steady stream of sorted, verified bulk waste from households and businesses.
                  </p>
                  
                  <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                      <span className="text-white/90">View marketplace requests</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                      <span className="text-white/90">Submit competitive quotations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                      <span className="text-white/90">Purchase bulk waste easily</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                      <span className="text-white/90">Manage collection history</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={20} />
                      <span className="text-white/90">Build ratings and reputation</span>
                    </li>
                  </ul>
                  
                  <Button size="lg" variant="primary" href="/signup?role=recyclingCompany" className="w-full bg-green-500 hover:bg-green-600 text-neutral-900 rounded-[12px] h-[52px] text-[16px] font-bold border-none transition-transform hover:-translate-y-0.5 shadow-sm">
                    Register as Recycling Company
                  </Button>
                </div>
              </div>

            </div>
          </PageContainer>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white py-16 border-t border-neutral-100">
        <PageContainer className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 md:px-12 lg:px-16">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-heading text-xl font-bold text-neutral-900">WasteWise</span>
            <span className="text-caption text-neutral-500 uppercase tracking-wider">Formalizing Waste Management</span>
          </div>
          <p className="text-body-sm text-neutral-500">
            &copy; {new Date().getFullYear()} WasteWise. All rights reserved.
          </p>
        </PageContainer>
      </footer>
    </>
  );
}
