import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/Button";
import { 
  UserCircle2, Leaf, ScanLine, Gift, Map, 
  Truck, Route, BarChart3, Star, 
  Factory, PackageOpen, Tag, PieChart
} from "lucide-react";

export default function SolutionsPage() {
  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/solutions", active: true },
    { label: "For Businesses", href: "/for-businesses" },
    { label: "About", href: "/about" },
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
              Platform Solutions
            </div>
            <h1 className="text-[28px] md:text-[36px] lg:text-[40px] font-bold text-neutral-900 mb-4 tracking-tight leading-[1.2]">
              A complete ecosystem for <span className="text-[#114E29]">sustainability</span>.
            </h1>
            <p className="text-[16px] md:text-[18px] text-neutral-600 leading-[1.6] max-w-[600px] mb-2">
              Whether you are recycling at home, managing daily scrap collections, or running a large-scale recycling facility—WasteWise has built specialized tools just for you.
            </p>
          </PageContainer>
        </section>

        {/* SOLUTIONS GRID */}
        <section className="py-16 md:py-24 bg-[#E6ECE8] border-b border-neutral-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-green-50 to-transparent rounded-bl-full opacity-60 pointer-events-none" />
          <PageContainer className="px-6 md:px-12 lg:px-16 max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Card 1: Individuals */}
              <div className="bg-[#F8FAF9] rounded-[20px] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-[#114E29]/10 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full group">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <UserCircle2 size={28} />
                </div>
                <h3 className="text-[24px] font-bold text-neutral-900 mb-3 tracking-tight">For Individuals</h3>
                <p className="text-neutral-600 text-[15px] leading-relaxed mb-8">
                  Recycle easily from your doorstep. Use our mobile-friendly tools to estimate the value of your waste and get rewarded instantly.
                </p>
                <ul className="space-y-5 mt-auto">
                  <li className="flex items-start gap-3">
                    <ScanLine className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-neutral-900 text-[15px]">AI Waste Recognition</h4>
                      <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">Snap a photo and our AI instantly categorizes the waste and estimates its market value.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Map className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-neutral-900 text-[15px]">Smart Pickup Request</h4>
                      <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">Schedule a pickup at your convenience and track the collector live on the map.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Gift className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-neutral-900 text-[15px]">Green Rewards</h4>
                      <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">Earn points for every kilogram recycled. Redeem them for mobile recharge or eco-friendly gifts.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Card 2: Collectors */}
              <div className="bg-[#F0FDF4] rounded-[20px] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(16,185,129,0.15)] border border-emerald-500/20 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    <Truck size={28} />
                  </div>
                  <h3 className="text-[24px] font-bold text-[#1A2E22] mb-3 tracking-tight">For Collectors</h3>
                  <p className="text-[#4B6358] text-[15px] leading-relaxed mb-8">
                    Formalize your daily operations. Stop wandering the streets and get guaranteed, scheduled pickups optimized directly for your route.
                  </p>
                  <ul className="space-y-5 mt-auto">
                    <li className="flex items-start gap-3">
                      <Route className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-bold text-[#1A2E22] text-[15px]">Route Optimization</h4>
                        <p className="text-[#4B6358] text-[13px] mt-1 leading-relaxed">We automatically sequence your daily accepted pickups into the fastest possible map route.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <BarChart3 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-bold text-[#1A2E22] text-[15px]">Earnings Tracking</h4>
                        <p className="text-[#4B6358] text-[13px] mt-1 leading-relaxed">Build a provable, digital income history to showcase to financial institutions or landlords.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <Star className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-bold text-[#1A2E22] text-[15px]">Customer Ratings</h4>
                        <p className="text-[#4B6358] text-[13px] mt-1 leading-relaxed">Maintain a high profile rating to get prioritized for premium, high-volume pickups.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card 3: Recycling Companies */}
              <div className="bg-[#F0FBFA] rounded-[20px] p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-teal-500/20 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full group">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Factory size={28} />
                </div>
                <h3 className="text-[24px] font-bold text-neutral-900 mb-3 tracking-tight">For Recycling Companies</h3>
                <p className="text-neutral-600 text-[15px] leading-relaxed mb-8">
                  Source bulk recyclable materials directly from verified businesses. Guarantee your supply chain with our transparent bidding platform.
                </p>
                <ul className="space-y-5 mt-auto">
                  <li className="flex items-start gap-3">
                    <PackageOpen className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-neutral-900 text-[15px]">Bulk Waste Marketplace</h4>
                      <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">Access verified listings of high-volume commercial waste from corporate offices and factories.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Tag className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-neutral-900 text-[15px]">Bidding System</h4>
                      <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">Submit competitive quotations based on exact material weight, purity, and pickup requirements.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <PieChart className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-neutral-900 text-[15px]">Inventory Insights</h4>
                      <p className="text-neutral-600 text-[13px] mt-1 leading-relaxed">Track your inbound raw materials and calculate operational capacity seamlessly.</p>
                    </div>
                  </li>
                </ul>
              </div>

            </div>
          </PageContainer>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-[#EAF0E6] to-[#DCE8E1] border-t border-[#114E29]/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#114E29_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.03]"></div>
          <PageContainer className="px-6 md:px-12 lg:px-16 max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-[28px] md:text-[32px] lg:text-[36px] font-bold text-[#1A2E22] mb-4 tracking-tight">Ready to formalize your operations?</h2>
            <p className="text-[#4B6358] mb-8 text-[16px] md:text-[18px]">
              Join thousands of individuals, collectors, and companies using WasteWise.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" href="/signup?role=user" className="bg-[#114E29] hover:bg-green-800 text-white rounded-full px-8 h-[48px] shadow-[0_8px_20px_rgb(17,78,41,0.15)] transition-transform hover:-translate-y-0.5 border-none">
                Create a Free Account
              </Button>
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
