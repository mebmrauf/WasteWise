"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { PageContainer } from "@/components/PageContainer";
import { 
  FilePlus, 
  FileText, 
  ThumbsUp, 
  Truck, 
  Gift, 
  ChevronRight, 
  ChevronLeft,
  ClipboardList,
  Trash2,
  Users,
  Handshake,
  Award
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Create a Pickup Request",
    description: "Select waste type, estimated weight, pickup location, and preferred collection date.",
    icon: FilePlus,
  },
  {
    id: 2,
    title: "Receive Quotations",
    description: "Verified Recycling Companies submit competitive quotations for your bulk waste.",
    icon: FileText,
  },
  {
    id: 3,
    title: "Accept the Best Offer",
    description: "Compare quotations, prices, schedules, and company ratings before selecting one.",
    icon: ThumbsUp,
  },
  {
    id: 4,
    title: "Collection & Verification",
    description: "The selected Recycling Company collects the waste, verifies the weight, and completes the pickup.",
    icon: Truck,
  },
  {
    id: 5,
    title: "Earn Rewards & Create Impact",
    description: "Receive payment, earn Green Points, unlock Business Membership rewards, download sustainability certificates, and optionally make a CSR contribution.",
    icon: Gift,
  },
];

const getIllustration = (stepId: number) => {
  switch (stepId) {
    case 1:
      return (
        <div className="relative w-full h-full flex items-center justify-center">
           <div className="absolute w-24 h-24 bg-[#DFF7EA] rounded-full blur-2xl opacity-70" />
           <ClipboardList size={48} className="text-[#114E29] relative z-10 translate-x-2 -translate-y-2" strokeWidth={1.2} />
           <Trash2 size={36} className="text-green-500 absolute bottom-[30%] right-[30%] -rotate-12" strokeWidth={1.5} />
        </div>
      );
    case 2:
      return (
        <div className="relative w-full h-full flex items-center justify-center">
           <div className="absolute w-24 h-24 bg-[#DFF7EA] rounded-full blur-2xl opacity-70" />
           <Users size={50} className="text-[#114E29] relative z-10 -translate-x-2" strokeWidth={1.2} />
           <FileText size={32} className="text-green-500 absolute top-[30%] right-[30%] rotate-12" strokeWidth={1.5} />
        </div>
      );
    case 3:
      return (
        <div className="relative w-full h-full flex items-center justify-center">
           <div className="absolute w-24 h-24 bg-[#DFF7EA] rounded-full blur-2xl opacity-70" />
           <Handshake size={56} className="text-[#114E29] relative z-10" strokeWidth={1.2} />
        </div>
      );
    case 4:
      return (
        <div className="relative w-full h-full flex items-center justify-center">
           <div className="absolute w-24 h-24 bg-[#DFF7EA] rounded-full blur-2xl opacity-70" />
           <Truck size={56} className="text-[#114E29] relative z-10" strokeWidth={1.2} />
        </div>
      );
    case 5:
      return (
        <div className="relative w-full h-full flex items-center justify-center">
           <div className="absolute w-24 h-24 bg-[#DFF7EA] rounded-full blur-2xl opacity-70" />
           <Gift size={48} className="text-[#114E29] relative z-10 translate-x-2 -translate-y-2" strokeWidth={1.2} />
           <Award size={36} className="text-green-500 absolute bottom-[30%] right-[30%] -rotate-12" strokeWidth={1.5} />
        </div>
      );
    default:
      return null;
  }
};

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating || activeStep === steps.length) return;
    setIsAnimating(true);
    setActiveStep((prev) => prev + 1);
    setTimeout(() => setIsAnimating(false), 350);
  };

  const handlePrev = () => {
    if (isAnimating || activeStep === 1) return;
    setIsAnimating(true);
    setActiveStep((prev) => prev - 1);
    setTimeout(() => setIsAnimating(false), 350);
  };

  return (
    <section id="how-it-works" className="py-6 md:py-8 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #F8FFFB 0%, #F3FAF6 100%)" }}>
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[-5%] w-[250px] h-[250px] rounded-full bg-[#114E29] opacity-[0.04] blur-[80px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[350px] h-[350px] rounded-full bg-[#114E29] opacity-[0.04] blur-[100px]" />
      </div>

      <PageContainer className="px-4 md:px-8 max-w-[1000px] relative z-10 mx-auto">
        
        {/* Heading & Subtitle */}
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h2 className="text-[24px] md:text-[30px] font-[800] text-neutral-900 leading-[1.2] mb-1.5">
            From <span className="text-[#114E29]">Waste</span> to <span className="text-[#114E29]">Value</span> <br className="hidden md:block"/> in just a few simple steps
          </h2>
          <p className="text-[14px] md:text-[15px] text-[#6B7280] max-w-[550px] mx-auto text-center leading-[1.6]">
            See how WasteWise transforms waste collection into a simple, transparent, and rewarding experience.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex flex-col items-center mb-4">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white shadow-sm border border-[#E8F5EE] text-[12px] md:text-[13px] font-bold text-neutral-500 tracking-wider mb-2 uppercase">
            STEP <span className="text-[#114E29] mx-1">{String(activeStep).padStart(2, '0')}</span> of {String(steps.length).padStart(2, '0')}
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step.id === activeStep
                    ? "bg-[#114E29] w-4"
                    : step.id < activeStep
                    ? "bg-green-300 w-1.5"
                    : "bg-neutral-200 w-1.5"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative min-h-[300px] md:min-h-[260px] max-w-[680px] mx-auto overflow-hidden rounded-[20px] bg-white border border-[#E8F5EE] shadow-[0_8px_24px_rgba(0,0,0,0.05)] flex flex-col w-full">
          {steps.map((step) => {
            const isActive = step.id === activeStep;
            const isPast = step.id < activeStep;

            return (
              <div
                key={step.id}
                className={`absolute inset-0 flex flex-col md:flex-row items-stretch transition-all duration-[350ms] ease-out bg-white ${
                  isActive
                    ? "opacity-100 translate-x-0 scale-100 z-10"
                    : `opacity-0 scale-[0.98] -z-10 pointer-events-none ${isPast ? "-translate-x-4" : "translate-x-4"}`
                }`}
              >
                {/* LEFT: Illustration (40%) */}
                <div className="hidden md:flex md:w-[40%] bg-[#F8FFFB] items-center justify-center border-r border-[#E8F5EE] p-4 relative overflow-hidden">
                  {getIllustration(step.id)}
                </div>

                {/* RIGHT: Content & Controls (60%) */}
                <div className="flex-1 flex flex-col justify-center p-4 md:p-6 text-left relative">
                  <div 
                    className="w-[48px] h-[48px] rounded-full shadow-[0_0_8px_rgba(17,78,41,0.06)] text-[#114E29] flex items-center justify-center mb-2"
                    style={{ background: "linear-gradient(135deg, #DFF7EA, #F5FFF9)" }}
                  >
                    <step.icon size={20} strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="text-[20px] md:text-[24px] font-bold text-neutral-900 mb-1.5 tracking-tight leading-[1.2]">
                    {step.title}
                  </h3>
                  
                  <p className="text-[13px] md:text-[14px] text-[#6B7280] leading-[1.6] max-w-[500px] mb-4">
                    {step.description}
                  </p>
                  
                  {/* Controls */}
                  <div className="mt-auto flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={handlePrev}
                      disabled={activeStep === 1}
                      className="h-[40px] px-4 rounded-[8px] border-neutral-200 text-neutral-700 font-semibold disabled:opacity-40 transition-transform hover:-translate-y-0.5 bg-white shadow-sm disabled:shadow-none disabled:hover:translate-y-0 text-[14px]"
                    >
                      Previous
                    </Button>
                    
                    {step.id === steps.length ? (
                      <Button
                        href="/signup"
                        className="h-[40px] px-5 rounded-[8px] bg-[#114E29] hover:bg-green-900 text-white font-bold transition-transform hover:-translate-y-0.5 shadow-md border-none flex items-center gap-2 text-[14px]"
                      >
                        Get Started
                        <ChevronRight size={16} />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="h-[40px] px-5 rounded-[8px] bg-gradient-to-r from-[#166534] to-[#114E29] hover:from-[#14532d] hover:to-[#0f4422] text-white font-semibold transition-transform hover:-translate-y-0.5 shadow-md border-none text-[14px]"
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PageContainer>
    </section>
  );
}
