"use client";

// Client Component for the same reasons as WasteRecognitionView: fetches
// user-specific data on mount and uses useRequireRole. Gated to USER-role
// accounts only, same audience as Waste Recognition.
import * as React from "react";
import { Card } from "@/components/Card";
import { Divider } from "@/components/Divider";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { getMySustainabilityReport, type SustainabilityReport, type WasteCategory } from "@/lib/api/sustainability";

const CATEGORY_LABELS: Record<WasteCategory, string> = {
  PLASTIC: "Plastic",
  PAPER: "Paper",
  ORGANIC: "Organic",
  GLASS: "Glass",
  METAL: "Metal",
  ELECTRONIC: "Electronic",
};

export function SustainabilityReportView() {
  const { user, isLoading } = useRequireRole(["USER"]);

  const [report, setReport] = React.useState<SustainabilityReport | null>(null);
  const [reportError, setReportError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    setReportError(null);
    getMySustainabilityReport()
      .then(({ report }) => setReport(report))
      .catch(() => {
        setReportError("Couldn't load your sustainability report. Try refreshing the page.");
      });
  }, [user]);

  if (isLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) {
    // useRequireRole is already redirecting — render nothing rather than flash gated content.
    return null;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Sustainability report</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Your recycling impact, calculated from your completed pickups.
      </p>

      {reportError && <ErrorBanner className="mt-8 max-w-form">{reportError}</ErrorBanner>}

      {!report && !reportError && (
        <p className="mt-8 text-body-sm text-neutral-500">Loading your report…</p>
      )}

      {report && report.completedPickupCount === 0 && (
        <Card className="mt-8 max-w-form">
          <p className="text-body-sm text-neutral-500">
            No completed pickups with a logged weight yet. Once your first pickup is completed
            and weighed, your impact will show up here.
          </p>
        </Card>
      )}

      {report && report.completedPickupCount > 0 && (
        <>
          <Card className="mt-8 max-w-form">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-caption text-neutral-500">Total recycled</p>
                <p className="text-h2 text-neutral-900">{report.totalKg} kg</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">CO2 avoided</p>
                <p className="text-h2 text-neutral-900">{report.totalCo2AvoidedKg} kg</p>
              </div>
              <div>
                <p className="text-caption text-neutral-500">Equivalent to</p>
                <p className="text-h2 text-neutral-900">{report.equivalentKmNotDriven} km</p>
                <p className="text-caption text-neutral-500">not driven</p>
              </div>
            </div>

            <Divider label="By category" className="my-6" />

            <ul className="flex flex-col gap-3">
              {report.byCategory.map((c) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0"
                >
                  <span className="text-body-sm text-neutral-900">{CATEGORY_LABELS[c.category]}</span>
                  <span className="text-caption text-neutral-500">
                    {c.totalKg} kg — {c.co2AvoidedKg} kg CO2 avoided
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <p className="mt-4 max-w-form text-caption text-neutral-400">
            CO2 figures are estimates based on published EPA WARM methodology, simplified per
            category. Based on {report.completedPickupCount} completed pickup
            {report.completedPickupCount === 1 ? "" : "s"}.
          </p>
        </>
      )}
    </PageContainer>
  );
}