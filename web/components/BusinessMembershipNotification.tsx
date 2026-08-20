"use client";

import * as React from "react";
import { X, Award, Diamond } from "lucide-react";
import { cn } from "@/lib/utils";

interface BusinessMembershipNotificationProps {
  level: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
}

export function BusinessMembershipNotification({
  level
}: BusinessMembershipNotificationProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  let content = null;
  let bgColor = "";
  let icon: React.ReactNode = null;

  switch (level) {
    case "BRONZE":
      icon = <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 shrink-0"><Award className="w-5 h-5" /></div>;
      bgColor = "bg-orange-50 border-orange-200 text-orange-900";
      content = (
        <span>
          You are currently a <strong>Bronze Business Member</strong>. Keep recycling to reach Silver (1,501 Green Points) and unlock 5% extra Green Points on every completed pickup!
        </span>
      );
      break;
    case "SILVER":
      icon = <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 shrink-0"><Award className="w-5 h-5" /></div>;
      bgColor = "bg-slate-100 border-slate-300 text-slate-900";
      content = (
        <span>
          Congratulations! You are now a <strong>Silver Business Member</strong>. You now earn 5% extra Green Points on every completed pickup. Keep recycling to reach Gold (3,001 Green Points) and unlock your Sustainability Certificate!
        </span>
      );
      break;

    case "GOLD":
      icon = <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-200 text-yellow-700 shrink-0"><Award className="w-5 h-5" /></div>;
      bgColor = "bg-yellow-50 border-yellow-200 text-yellow-900";
      content = (
        <span>
          Congratulations! You are now a <strong>Gold Business Member</strong>. You earn 10% extra Green Points, and your <strong>Sustainability Certificate</strong> is ready to download! Keep recycling to reach Platinum!
        </span>
      );
      break;
    case "PLATINUM":
      icon = <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-200 text-purple-700 shrink-0"><Diamond className="w-5 h-5" /></div>;
      bgColor = "bg-purple-50 border-purple-200 text-purple-900";
      content = (
        <span>
          You are a <strong>Platinum Business Member</strong>! You earn 15% extra Green Points on every completed pickup, and you are eligible for Tree Plantations.
        </span>
      );
      break;
  }

  return (
    <div className={cn("relative flex items-center gap-4 p-4 rounded-xl border animate-fade-in shadow-sm", bgColor)}>
      {icon}
      <div className="flex-1 text-sm md:text-base leading-relaxed pr-6">{content}</div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-5 h-5 opacity-60 hover:opacity-100" />
      </button>
    </div>
  );
}
