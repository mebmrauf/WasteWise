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
          { label: "How It Works", href: "/#how-it-works" },
          { label: "Features", href: "/#features" },
          { label: "For Businesses", href: "/for-businesses", active: true },
          { label: "For Partners", href: "/for-partners" },
          { label: "About", href: "/#about" },
          { label: "Contact", href: "/#contact" },
        ]}
        actions={<NavAuthActions />}
      />

      <main className="flex flex-col min-h-screen">
        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-br from-green-50/50 to-neutral-50 py-24 lg:py-32">
          <PageContainer className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto px-6 md:px-12 lg:px-16">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-green-50 text-green-700 text-[14px] font-semibold mb-8 shadow-[0_2px_10px_rgb(0,0,0,0.04)] border border-green-200/50">
              Enterprise Solutions
            </div>
            <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-bold text-neutral-900 mb-6 tracking-tight leading-[1.1] max-w-[800px]">
              Sustainable Waste Management for <span className="text-[#114E29]">Your Business</span>
            </h1>
            <p className="text-[18px] md:text-[20px] text-neutral-600 mb-10 leading-8 max-w-[600px]">
              Turn your commercial waste into value. Request bulk pickups, track your environmental impact, and get competitive quotations from verified recycling companies.
            </p>
            <Button size="lg" href="/signup?accountType=BUSINESS" className="bg-[#114E29] hover:bg-green-800 text-white rounded-full px-8 h-[52px] text-[16px] transition-transform hover:-translate-y-1 border-none shadow-sm">
              Register as Business
            </Button>
          </PageContainer>
        </section>

        {/* FEATURES GRID */}
        <section className="py-24 lg:py-32 bg-white">
          <PageContainer className="px-6 md:px-12 lg:px-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                  <Truck size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Bulk Waste Pickup</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Easily schedule large-scale waste collections tailored to your business schedule and volume requirements.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                  <Receipt size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Competitive Quotations</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Receive and compare bids from verified recycling companies to ensure you get the best value for your waste.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6">
                  <History size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Track Pickup History</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Maintain a complete digital record of all your waste collections and transactions in one centralized dashboard.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center mb-6">
                  <Gift size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Green Rewards</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Earn points for every kilogram of waste recycled and redeem them for exclusive benefits and perks.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                  <FileText size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Sustainability Reporting</h3>
                <p className="text-body text-neutral-600 leading-relaxed">
                  Generate detailed reports on your environmental impact to share with stakeholders and meet ESG goals.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-neutral-50 rounded-[20px] p-8 border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
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
