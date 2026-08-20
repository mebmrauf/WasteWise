import { Button } from "@/components/Button";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { PageContainer } from "@/components/PageContainer";
import { Truck, Receipt, History, Gift, FileText, Award } from "lucide-react";

export default function ForBusinessesPage() {
  return (
    <>
      <NavBar
        brand={
          <a href="/" className="flex flex-col">
            <span className="font-heading text-h4 text-neutral-900 leading-none">WasteWise</span>
          </a>
        }
        links={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions" },
          { label: "For Businesses", href: "/for-businesses", active: true },
          { label: "About", href: "/about" },
        ]}
        actions={<NavAuthActions />}
      />

      <main className="flex flex-col min-h-screen">
        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-br from-[#EAF3EE] to-[#F0F2EB] py-12 md:py-16 lg:py-20">
          <PageContainer className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto px-6 md:px-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-[13px] font-semibold mb-4 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-green-200/50">
              Enterprise Solutions
            </div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-neutral-900 mb-4 tracking-tight leading-[1.2]">
              Sustainable Waste Management for <span className="text-[#114E29]">Your Business</span>
            </h1>
            <p className="text-sm lg:text-base text-neutral-600 mb-6 leading-relaxed max-w-xl mx-auto">
              Turn your commercial waste into value. Request bulk pickups, track your environmental impact, and get competitive quotations from verified recycling companies.
            </p>
            <Button size="lg" href="/signup?accountType=BUSINESS" className="bg-[#114E29] hover:bg-green-800 text-white rounded-full px-8 h-[48px] text-[15px] transition-transform hover:-translate-y-0.5 border-none shadow-sm">
              Register as Business
            </Button>
          </PageContainer>
        </section>

        {/* FEATURES GRID */}
        <section className="py-12 md:py-16 lg:py-20 bg-[#EBEFEA] border-t border-neutral-100">
          <PageContainer className="px-6 md:px-12 lg:px-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-8 border border-neutral-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                  <Truck size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Bulk Waste Pickup</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Easily schedule large-scale waste collections tailored to your business schedule and volume requirements.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-8 border border-neutral-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                  <Receipt size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Competitive Quotations</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Receive and compare bids from verified recycling companies to ensure you get the best value for your waste.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-8 border border-neutral-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6">
                  <History size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Track Pickup History</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Maintain a complete digital record of all your waste collections and transactions in one centralized dashboard.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-8 border border-neutral-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center mb-6">
                  <Gift size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Green Rewards</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Earn points for every kilogram of waste recycled and redeem them for exclusive benefits and perks.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-8 border border-neutral-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                  <FileText size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Sustainability Reporting</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Generate detailed reports on your environmental impact to share with stakeholders and meet ESG goals.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-gradient-to-br from-white to-[#F8FAF9] rounded-[20px] p-8 border border-neutral-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgb(17,78,41,0.06)] hover:border-[#114E29]/20 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                  <Award size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Business Loyalty Program</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Unlock tiered benefits, priority support, and special recognition as your recycling volume grows over time.
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
          <p className="text-[13px] text-neutral-500 leading-tight uppercase tracking-wider">
            Formalizing Waste Management
          </p>
          <p className="text-[12px] text-neutral-400 leading-tight mt-1">
            &copy; {new Date().getFullYear()} WasteWise. All rights reserved.
          </p>
        </PageContainer>
      </footer>
    </>
  );
}
