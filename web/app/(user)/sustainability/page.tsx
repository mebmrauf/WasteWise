import type { Metadata } from "next";
import { SustainabilityReportView } from "./SustainabilityReportView";

export const metadata: Metadata = {
  title: "Sustainability Report",
  description: "See your recycling impact and CO2 savings.",
  robots: { index: false },
};

export default function SustainabilityReportPage() {
  return <SustainabilityReportView />;
}