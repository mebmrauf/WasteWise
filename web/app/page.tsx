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
          { label: "How It Works", href: "#how-it-works" },
          { label: "Features", href: "#features" },
          { label: "For Businesses", href: "/for-businesses" },
          { label: "For Partners", href: "/for-partners" },
          { label: "About", href: "#about" },
          { label: "Contact", href: "#contact" },
        ]}
        actions={<NavAuthActions />}
      />

      <main className="flex flex-col min-h-screen">
        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-br from-neutral-50 to-green-50/30 py-24 lg:py-32">
          <PageContainer className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center px-6 md:px-12 lg:px-16">
            <div className="flex flex-col max-w-[600px]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-body-sm font-medium mb-8 w-max border border-green-200/50">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Now available in Dhaka
              </div>
              <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-bold text-neutral-900 mb-6 tracking-tight leading-[1.1] max-w-[600px]">
                Transforming Waste into <span className="text-[#114E29] relative inline-block">Value<span className="absolute bottom-2 left-0 w-full h-3 bg-green-200/30 -z-10 rounded-full"></span></span>
              </h1>
              <p className="text-[18px] md:text-[20px] text-neutral-600 mb-10 leading-8 max-w-[540px]">
                WasteWise brings the informal scrap collection network online. Post a pickup request, track verified collectors in real-time, and earn Green Points for doing your part.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" href="/signup" className="bg-[#114E29] hover:bg-green-800 text-white rounded-full px-8 h-[52px] text-[16px] transition-transform hover:-translate-y-0.5 border-none shadow-sm">
                  Request a pickup
                </Button>
                <Button size="lg" variant="secondary" href="/signup?role=collector" className="rounded-full px-8 h-[52px] border-neutral-300 text-[16px] transition-transform hover:-translate-y-0.5 bg-white hover:bg-neutral-50 shadow-sm">
                  Join as a collector
                </Button>
              </div>
              
              {/* Trust Badges below CTA */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-6 border-t border-neutral-200/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-green-600" size={20} />
                  <span className="text-body-sm font-medium text-neutral-700">Verified Collectors</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <span className="text-body-sm font-medium text-neutral-700">Secure Transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="text-green-600" size={20} />
                  <span className="text-body-sm font-medium text-neutral-700">Green Rewards</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="text-green-600" size={20} />
                  <span className="text-body-sm font-medium text-neutral-700">Real-Time Tracking</span>
                </div>
              </div>
            </div>

            <div className="relative lg:w-4/5 lg:ml-auto">
              <div className="relative rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200/50 aspect-[4/3] bg-neutral-100 flex items-center justify-center group animate-float">
                <Image
                  src="/images/hero.png"
                  alt="WasteWise Smart Logistics"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Floating badges */}
              <div className="absolute bottom-4 left-4 bg-white p-4 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-neutral-100 flex items-center gap-4 z-20 animate-fade-in-up">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-700">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">Security</p>
                  <p className="text-[14px] font-bold text-neutral-900">Verified Collectors</p>
                </div>
              </div>
            </div>
          </PageContainer>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 lg:py-32 bg-white">
          <PageContainer className="px-6 md:px-12 lg:px-16">
            <div className="text-center max-w-2xl mx-auto mb-20">
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
        <section id="features" className="py-24 lg:py-32 bg-neutral-50/50">
          <PageContainer className="px-6 md:px-12 lg:px-16">
            <div className="mb-16">
              <h2 className="text-h2 text-neutral-900 mb-4">Built for Trust & Efficiency</h2>
              <p className="text-body-lg text-neutral-600 max-w-2xl">
                We've combined modern logistics tech with the existing collector network to create a seamless experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6">

              {/* Large Feature 1 */}
              <div className="md:col-span-2 bg-white rounded-[20px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-200/60 overflow-hidden relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
                <div className="relative z-10 w-full md:w-2/3">
                  <div className="w-14 h-14 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-8">
                    <Camera size={28} />
                  </div>
                  <h3 className="text-h3 text-neutral-900 mb-4">AI Waste Recognition</h3>
                  <p className="text-body-lg text-neutral-600 leading-relaxed">
                    Not sure what can be recycled? Just point your camera. Our AI model identifies materials instantly and tells you how to separate them.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full bg-gradient-to-tl from-purple-50 to-transparent -z-10 group-hover:scale-110 transition-transform duration-700 origin-bottom-right" />
              </div>

              {/* Small Feature 1 */}
              <div className="bg-[#114E29] rounded-[20px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.08)] text-white overflow-hidden relative group transition-transform hover:-translate-y-1 duration-300">
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-white/10 text-white flex items-center justify-center mb-8">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-h4 mb-4">Verified Network</h3>
                  <p className="text-body text-white/80 leading-relaxed">
                    Every collector has passed ID and background verification for your safety.
                  </p>
                </div>
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors duration-500" />
              </div>

              {/* Small Feature 2 */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-[20px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-yellow-200/50 transition-transform hover:-translate-y-1 duration-300">
                <div className="w-14 h-14 rounded-xl bg-yellow-200 text-yellow-800 flex items-center justify-center mb-8 shadow-sm">
                  <Gift size={28} />
                </div>
                <h3 className="text-h4 text-neutral-900 mb-4">Green Rewards</h3>
                <p className="text-body text-neutral-700 leading-relaxed">
                  Earn points for every KG recycled. Redeem points directly for mobile recharge.
                </p>
              </div>

              {/* Large Feature 2 */}
              <div className="md:col-span-2 bg-white rounded-[20px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-200/60 overflow-hidden relative hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
                <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-8">
                  <MapPin size={28} />
                </div>
                <h3 className="text-h3 text-neutral-900 mb-4">Real-Time Tracking</h3>
                <p className="text-body-lg text-neutral-600 max-w-xl leading-relaxed">
                  Follow your collector's exact location on a live map so you know exactly when they'll arrive at your door. No more waiting around.
                </p>
              </div>

            </div>
          </PageContainer>
        </section>

        {/* DUAL AUDIENCE SPLIT */}
        <section id="collectors" className="py-24 lg:py-32 bg-white border-t border-neutral-100">
          <PageContainer className="px-6 md:px-12 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

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

              <div className="bg-neutral-900 rounded-[20px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <h2 className="text-h3 text-white mb-6">For Scrap Collectors</h2>
                  <p className="text-white/70 mb-8 leading-relaxed">
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
                  <Button size="lg" variant="primary" href="/signup?role=collector" className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-neutral-900 h-[52px] px-8 text-[16px] font-bold border-none transition-transform hover:-translate-y-0.5">
                    Apply to become a collector
                  </Button>
                </div>
              </div>

            </div>
          </PageContainer>
        </section>
      </main>

      {/* ABOUT SECTION */}
      <section id="about" className="py-24 lg:py-32 bg-green-50/20 border-t border-neutral-100">
        <PageContainer className="px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div>
              <p className="font-heading text-[12px] uppercase tracking-wider text-green-700 mb-3 font-semibold">About Us</p>
              <h2 className="text-[32px] md:text-[40px] font-bold text-neutral-900 mb-6 leading-[1.2]">About WasteWise</h2>
              <div className="text-[18px] text-neutral-600 space-y-6 leading-8 max-w-[540px]">
                <p>
                  <strong className="text-neutral-900 font-bold">WasteWise</strong> is transforming the way Bangladesh manages waste by bringing the entire recycling ecosystem onto one intelligent digital platform. We seamlessly connect <strong className="text-[#114E29] font-semibold">Individuals</strong>, <strong className="text-[#114E29] font-semibold">Businesses</strong>, <strong className="text-[#114E29] font-semibold">Collectors</strong>, and <strong className="text-[#114E29] font-semibold">Recycling Companies</strong> to make waste collection faster, more transparent, and more rewarding.
                </p>
                <p>
                  From <strong className="text-[#114E29] font-semibold">AI-powered waste recognition</strong> and real-time pickup tracking to verified service providers, <strong className="text-[#114E29] font-semibold">Green Rewards</strong>, and a <strong className="text-[#114E29] font-semibold">smart recycling marketplace</strong>, WasteWise simplifies every step of the recycling journey. Our goal is to reduce landfill waste, encourage responsible recycling, and create sustainable economic opportunities for everyone involved.
                </p>
                <p className="text-neutral-900 font-semibold">
                  Together, we're turning waste into value—building a cleaner, greener, and smarter Bangladesh, one pickup at a time.
                </p>
              </div>
            </div>
            <div id="contact" className="bg-white p-10 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100">
              <h3 className="text-h3 text-neutral-900 mb-8">Get in Touch</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-body-sm font-medium text-neutral-700 mb-1">Name</label>
                  <input type="text" className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Your Name" />
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-neutral-700 mb-1">Email</label>
                  <input type="email" className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-body-sm font-medium text-neutral-700 mb-1">Message</label>
                  <textarea rows={4} className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="How can we help?"></textarea>
                </div>
                <Button className="w-full bg-[#114E29] hover:bg-green-800 text-white rounded-[12px] h-12">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </PageContainer>
      </section>

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
