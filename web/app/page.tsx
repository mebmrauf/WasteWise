import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { NavBar } from "@/components/NavBar";
import { NavAuthActions } from "@/components/NavAuthActions";
import { PageContainer } from "@/components/PageContainer";



const steps = [
  {
    number: "01",
    title: "Post a pickup request",
    body: "Pick a waste category, an estimated quantity, and a time slot. WasteWise shows an estimated weight range up front, before anyone shows up.",
  },
  {
    number: "02",
    title: "Collectors make offers",
    body: "Nearby verified collectors see your request and bid for the job. You choose who comes — not whoever happens to be walking by.",
  },
  {
    number: "03",
    title: "Track it, weigh it, keep the record",
    body: "Follow your collector's live location on the map, confirm the exact weight logged at pickup, and it's saved to your recycling history.",
  },
];

const trustFeatures = [
  {
    title: "Verified Collector Directory",
    body: "Browse nearby collectors by distance, rating, and vehicle type. Every listed profile has passed ID/license verification before it appears.",
  },
  {
    title: "Weight Verification & Estimator",
    body: "See an estimated weight range before pickup, then the exact logged weight at collection — no more guessing what you'll be paid or charged.",
  },
  {
    title: "Real-Time Pickup Tracking",
    body: "Once an offer is accepted, follow your collector's live location on the map until they arrive at your door.",
  },
  {
    title: "Complaint & Resolution Center",
    body: "No-show, disputed weight, bad conduct — every pickup has a direct path to resolution, logged against the collector's record.",
  },
];

const collectorFeatures = [
  {
    title: "Smart Pickup Requests & Offers",
    body: "See nearby requests by category, quantity, and time slot, then bid on the jobs worth your time — instead of waiting on foot traffic.",
  },
  {
    title: "Route Planner",
    body: "Once a day's jobs are accepted, WasteWise sequences them into one optimized route — less backtracking, more pickups per shift.",
  },
  {
    title: "Business Dashboard",
    body: "Schedule, earnings, and ratings in one place — an income history a collector can finally show a bank, a landlord, or a lender.",
  },
];

const roleCards = [
  {
    role: "User",
    body: "Post a pickup, pick a verified collector, track it live, and keep a running history of what you've recycled.",
  },
  {
    role: "Collector",
    body: "Turn foot-traffic scrap collection into a schedule, an optimized route, and a provable income record.",
  },
  {
    role: "Recycling Company",
    body: "Procure verified bulk waste by district and reserve stock ahead of pickup.",
    note: "Phase 2",
  },
  {
    role: "Admin / Municipality",
    body: "Review verification applications, resolve disputes, and see collection activity across the city.",
  },
];

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
        brand={<span className="font-heading text-h4 text-neutral-900">WasteWise</span>}
        links={[
          { label: "How it works", href: "#how-it-works" },
          { label: "Collectors", href: "#collectors" },
        ]}
        actions={<NavAuthActions />}
      />

      <main>
        {}
        <section className="bg-primary-50">
          <PageContainer className="py-16 lg:py-24">
            <div className="max-w-3xl">
              <p className="font-heading text-overline text-primary-600">
                Recycling logistics for Bangladesh
              </p>
              <h1 className="mt-3 text-display text-neutral-900">
                Bangladesh&apos;s scrap collectors already run this network. WasteWise makes it
                official.
              </h1>
              <p className="mt-5 text-body-lg text-neutral-600">
                Prior platforms tried to route around the country&apos;s informal collectors.
                WasteWise routes through them: a verified profile, a bidding system for pickup
                requests, route tools, and an income dashboard for collectors — plus the
                tracking, weight verification, and complaint resolution households and
                businesses never had with a doorstep pickup.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" href="/signup">
                  Request a pickup
                </Button>
                <Button size="lg" variant="secondary" href="/signup?role=collector">
                  Sign up as a collector
                </Button>
              </div>
            </div>
          </PageContainer>
        </section>

        {}
        <section id="how-it-works" className="bg-neutral-0">
          <PageContainer className="py-16 lg:py-20">
            <p className="font-heading text-overline text-primary-600">How it works</p>
            <h2 className="mt-2 text-h2 text-neutral-900">
              From request to verified pickup, in three steps
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <Card key={step.number}>
                  <p className="font-data text-data-lg text-primary-500">{step.number}</p>
                  <h3 className="mt-3 text-h4 text-neutral-900">{step.title}</h3>
                  <p className="mt-2 text-body-sm text-neutral-500">{step.body}</p>
                </Card>
              ))}
            </div>
          </PageContainer>
        </section>

        {}
        <section className="bg-neutral-50">
          <PageContainer className="py-16 lg:py-20">
            <p className="font-heading text-overline text-primary-600">Trust infrastructure</p>
            <h2 className="mt-2 max-w-2xl text-h2 text-neutral-900">
              Everything an informal pickup never put in writing
            </h2>
            <p className="mt-4 max-w-2xl text-body-lg text-neutral-600">
              Every collector on WasteWise is verified before they&apos;re listed, and every
              pickup leaves a record — location, weight, and a way to dispute either one.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trustFeatures.map((feature) => (
                <Card key={feature.title}>
                  <h3 className="text-h4 text-neutral-900">{feature.title}</h3>
                  <p className="mt-2 text-body-sm text-neutral-500">{feature.body}</p>
                </Card>
              ))}
            </div>
          </PageContainer>
        </section>

        {}
        <section id="collectors" className="bg-role-collector-50">
          <PageContainer className="py-16 lg:py-20">
            <p className="font-heading text-overline text-role-collector-700">For collectors</p>
            <h2 className="mt-2 max-w-2xl text-h2 text-neutral-900">
              Formalizing the network, not replacing it
            </h2>
            <p className="mt-4 max-w-2xl text-body-lg text-neutral-600">
              Existing apps tried to disintermediate Bangladesh&apos;s scrap collectors.
              WasteWise&apos;s bet is the opposite: give the people already doing this work a
              verified profile, steadier demand, and a provable income record.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {collectorFeatures.map((feature) => (
                <Card key={feature.title}>
                  <h3 className="text-h4 text-neutral-900">{feature.title}</h3>
                  <p className="mt-2 text-body-sm text-neutral-500">{feature.body}</p>
                </Card>
              ))}
            </div>
            <div className="mt-8">
              <Button variant="ghost" href="/signup?role=collector">
                Sign up as a collector →
              </Button>
            </div>
          </PageContainer>
        </section>

        {}
        <section className="bg-neutral-0">
          <PageContainer className="py-16 lg:py-20">
            <p className="font-heading text-overline text-primary-600">Who it&apos;s for</p>
            <h2 className="mt-2 text-h2 text-neutral-900">One platform, four roles, one loop</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {roleCards.map((card) => (
                <Card key={card.role}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-h4 text-neutral-900">{card.role}</h3>
                    {card.note && (
                      <span className="text-caption text-neutral-400">{card.note}</span>
                    )}
                  </div>
                  <p className="mt-2 text-body-sm text-neutral-500">{card.body}</p>
                </Card>
              ))}
            </div>
          </PageContainer>
        </section>

        {}
        <section className="bg-neutral-50">
          <PageContainer className="py-16 text-center lg:py-24">
            <p className="font-heading text-overline text-primary-600">Get started</p>
            <h2 className="mt-2 text-h2 text-neutral-900">Put your next pickup in writing</h2>
            <p className="mx-auto mt-4 max-w-xl text-body-lg text-neutral-600">
              Whether you&apos;re clearing out recyclables or looking for steadier collection
              work, WasteWise gives both sides of the pickup something the informal system never
              had: a record.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" href="/signup">
                Sign up
              </Button>
              <Button size="lg" variant="secondary" href="/login">
                Log in
              </Button>
            </div>
          </PageContainer>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-neutral-0">
        <PageContainer className="flex flex-col items-start justify-between gap-4 py-8 md:flex-row md:items-center">
          <div>
            <p className="font-heading text-h4 text-neutral-900">WasteWise</p>
            <p className="mt-1 text-body-sm text-neutral-500">
              Digitizing recycling logistics in Bangladesh.
            </p>
          </div>
          <p className="text-caption text-neutral-400">
            &copy; {new Date().getFullYear()} WasteWise. All rights reserved.
          </p>
        </PageContainer>
      </footer>
    </>
  );
}
