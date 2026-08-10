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
} from "lucide-react";

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
          { label: "How it works", href: "#how-it-works" },
          { label: "Features", href: "#features" },
          { label: "For Collectors", href: "#collectors" },
        ]}
        actions={<NavAuthActions />}
      />

      <main className="overflow-hidden">
        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-br from-neutral-50 to-green-50 pt-20 pb-24 lg:pt-32 lg:pb-32 overflow-hidden">
          <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-green-200/40 blur-3xl rounded-full pointer-events-none" />
          <PageContainer className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-caption font-medium mb-6 w-max border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Now available in Dhaka
              </div>
              <h1 className="text-display text-neutral-900 mb-6 tracking-tight leading-[1.1]">
                Formalizing Waste Management in <span className="text-[#114E29]">Bangladesh</span>
              </h1>
              <p className="text-body-lg text-neutral-600 mb-8 leading-relaxed">
                WasteWise brings the informal scrap collection network online. Post a pickup request, track verified collectors in real-time, and earn Green Points for doing your part.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" href="/signup" className="bg-[#114E29] hover:bg-green-800 text-white rounded-full px-8 shadow-lg shadow-green-900/20">
                  Request a pickup
                </Button>
                <Button size="lg" variant="secondary" href="/signup?role=collector" className="rounded-full px-8 border-neutral-300">
                  Join as a collector
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-green-900/10 border-4 border-white aspect-[4/3] bg-neutral-100 flex items-center justify-center group">
                <div className="absolute inset-0 bg-[#114E29]/10 group-hover:bg-transparent transition-colors z-10" />
                <Image 
                  src="/images/hero.png" 
                  alt="WasteWise Smart Logistics" 
                  fill 
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Floating badges */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-neutral-100 flex items-center gap-4 z-20 animate-fade-in-up">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <p className="text-overline text-neutral-500">SECURITY</p>
                  <p className="font-bold text-neutral-900">Verified Collectors</p>
                </div>
              </div>
            </div>
          </PageContainer>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-white">
          <PageContainer>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="font-heading text-overline text-green-700 mb-2">Simple Process</p>
              <h2 className="text-h2 text-neutral-900">How WasteWise Works</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector line (desktop only) */}
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-neutral-100 -z-10" />
              
              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-full bg-green-50 border-8 border-white shadow-sm flex items-center justify-center text-[#114E29] mb-6 group-hover:scale-110 transition-transform">
                  <Truck size={36} />
                </div>
                <h3 className="text-h4 mb-3 text-neutral-900">1. Post a Request</h3>
                <p className="text-body text-neutral-600">Snap a photo or select your waste categories. We instantly estimate the weight and value.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-full bg-blue-50 border-8 border-white shadow-sm flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                  <ClipboardList size={36} />
                </div>
                <h3 className="text-h4 mb-3 text-neutral-900">2. Collectors Bid</h3>
                <p className="text-body text-neutral-600">Nearby verified collectors see your request and accept the job based on your preferred time.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-full bg-yellow-50 border-8 border-white shadow-sm flex items-center justify-center text-yellow-600 mb-6 group-hover:scale-110 transition-transform">
                  <MapPin size={36} />
                </div>
                <h3 className="text-h4 mb-3 text-neutral-900">3. Track & Complete</h3>
                <p className="text-body text-neutral-600">Track them live on the map. They weigh it, take it, and you instantly earn Green Points.</p>
              </div>
            </div>
          </PageContainer>
        </section>

        {/* FEATURES BENTO GRID */}
        <section id="features" className="py-24 bg-neutral-50">
          <PageContainer>
            <div className="mb-12">
              <h2 className="text-h2 text-neutral-900 mb-4">Built for Trust & Efficiency</h2>
              <p className="text-body-lg text-neutral-600 max-w-2xl">
                We've combined modern logistics tech with the existing collector network to create a seamless experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">
              
              {/* Large Feature 1 */}
              <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-neutral-200/60 overflow-hidden relative group">
                <div className="relative z-10 w-2/3">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                    <Camera size={24} />
                  </div>
                  <h3 className="text-h3 text-neutral-900 mb-3">AI Waste Recognition</h3>
                  <p className="text-body text-neutral-600">
                    Not sure what can be recycled? Just point your camera. Our AI model identifies materials instantly and tells you how to separate them.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-tl from-purple-50 to-transparent -z-10 group-hover:scale-110 transition-transform origin-bottom-right" />
              </div>

              {/* Small Feature 1 */}
              <div className="bg-[#114E29] rounded-3xl p-8 shadow-sm text-white overflow-hidden relative group">
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-6">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-h4 mb-3">Verified Network</h3>
                  <p className="text-body-sm text-white/80">
                    Every collector has passed ID and background verification for your safety.
                  </p>
                </div>
              </div>

              {/* Small Feature 2 */}
              <div className="bg-yellow-100 rounded-3xl p-8 shadow-sm border border-yellow-200/50">
                <div className="w-12 h-12 rounded-xl bg-yellow-200 text-yellow-800 flex items-center justify-center mb-6">
                  <Gift size={24} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-3">Green Rewards</h3>
                <p className="text-body-sm text-neutral-700">
                  Earn points for every KG recycled. Redeem points directly for mobile recharge.
                </p>
              </div>

              {/* Large Feature 2 */}
              <div className="md:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-neutral-200/60 overflow-hidden relative">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                  <MapPin size={24} />
                </div>
                <h3 className="text-h3 text-neutral-900 mb-3">Real-Time Tracking</h3>
                <p className="text-body text-neutral-600 max-w-lg">
                  Follow your collector's exact location on a live map so you know exactly when they'll arrive at your door. No more waiting around.
                </p>
              </div>

            </div>
          </PageContainer>
        </section>

        {/* DUAL AUDIENCE SPLIT */}
        <section id="collectors" className="py-24 bg-white border-t border-neutral-100">
          <PageContainer>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              
              <div>
                <h2 className="text-h3 text-neutral-900 mb-6">For Households & Businesses</h2>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-neutral-900">Convenience at your door</h4>
                      <p className="text-neutral-600 text-body-sm mt-1">Schedule pickups precisely when you are home.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-neutral-900">Fair Weight & Pricing</h4>
                      <p className="text-neutral-600 text-body-sm mt-1">Pre-estimated weights keep transactions honest and transparent.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <CheckCircle2 className="text-green-600 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-neutral-900">Digital Record</h4>
                      <p className="text-neutral-600 text-body-sm mt-1">Track your total contribution to the environment over time.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-neutral-900 rounded-3xl p-8 md:p-12 text-white shadow-2xl">
                <h2 className="text-h3 text-white mb-6">For Scrap Collectors</h2>
                <p className="text-white/70 mb-8">
                  Stop wandering streets hoping for scrap. Turn your daily foot traffic into a formal, structured business.
                </p>
                <ul className="space-y-6 mb-10">
                  <li className="flex items-start gap-4">
                    <Route className="text-green-400 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-white">Route Optimization</h4>
                      <p className="text-white/60 text-body-sm mt-1">We sequence your daily jobs into one optimized map route.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <ClipboardList className="text-green-400 shrink-0 mt-1" />
                    <div>
                      <h4 className="font-bold text-white">Income Dashboard</h4>
                      <p className="text-white/60 text-body-sm mt-1">Build a provable income history to show banks and landlords.</p>
                    </div>
                  </li>
                </ul>
                <Button size="lg" variant="primary" href="/signup?role=collector" className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-neutral-900 font-bold border-none">
                  Apply to become a collector
                </Button>
              </div>

            </div>
          </PageContainer>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-neutral-50 py-4 border-t border-neutral-200/60">
        <PageContainer className="flex flex-col md:flex-row items-center justify-between gap-6">
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
