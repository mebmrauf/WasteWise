"use client";

import * as React from "react";
import {
  getCollectors,
  verifyCollector,
  getRecyclingCompanies,
  verifyRecyclingCompany,
  getBusinesses,
  verifyBusiness,
  type CollectorWithUser,
  type RecyclingCompanyWithUser,
  type BusinessWithUser,
} from "@/lib/api/admin";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StatusPill } from "@/components/StatusPill";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicleType";
import { PageContainer } from "@/components/PageContainer";
import type { VerificationStatus } from "@/lib/api/users";
import { cn } from "@/lib/utils";

type EntityKind = "COLLECTOR" | "RECYCLING_COMPANY" | "BUSINESS";

interface VerifiableUser {
  verificationStatus: VerificationStatus;
  user: { id: string; email: string; phone: string | null; fullName: string };
}

function VerificationSection<T extends VerifiableUser>({
  title,
  items,
  emptyPendingLabel,
  emptyVerifiedLabel,
  renderDetails,
  onAction,
}: {
  title: string;
  items: T[];
  emptyPendingLabel: string;
  emptyVerifiedLabel: string;
  renderDetails: (item: T) => React.ReactNode;
  onAction: (id: string, action: "APPROVE" | "REJECT") => void;
}) {
  const pending = items.filter((c) => c.verificationStatus === "PENDING");
  const verified = items.filter((c) => c.verificationStatus !== "PENDING");

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="text-h3 text-neutral-900 mb-4">Awaiting Verification</h2>
        {pending.length === 0 ? (
          <Card className="py-12 text-center flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl">
            <p className="text-body font-medium text-neutral-900">No pending approvals</p>
            <p className="text-body-sm text-neutral-500 mt-1">{emptyPendingLabel}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((item) => (
              <Card
                key={item.user.id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white border border-neutral-100 shadow-sm rounded-2xl border-l-4 border-l-amber-500"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-body font-medium text-neutral-900">{item.user.fullName}</h3>
                    <StatusPill tone="warning">Pending Verification</StatusPill>
                  </div>
                  <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                    <span><strong className="font-medium">Email:</strong> {item.user.email}</span>
                    <span><strong className="font-medium">Phone:</strong> {item.user.phone || "N/A"}</span>
                  </div>
                  <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                    {renderDetails(item)}
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                  <Button variant="secondary" fullWidth onClick={() => onAction(item.user.id, "REJECT")}>
                    Reject
                  </Button>
                  <Button variant="primary" fullWidth onClick={() => onAction(item.user.id, "APPROVE")}>
                    Approve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-h3 text-neutral-900 mb-4">{title}</h2>
        {verified.length === 0 ? (
          <Card className="py-12 text-center flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl">
            <p className="text-body font-medium text-neutral-500">{emptyVerifiedLabel}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {verified.map((item) => (
              <Card
                key={item.user.id}
                className={cn(
                  "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white border border-neutral-100 shadow-sm rounded-2xl border-l-4",
                  item.verificationStatus === "APPROVED" ? "border-l-emerald-500" : "border-l-red-500",
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-body font-medium text-neutral-900">{item.user.fullName}</h3>
                    <StatusPill tone={item.verificationStatus === "APPROVED" ? "success" : "error"}>
                      {item.verificationStatus === "APPROVED" ? "Approved" : "Rejected"}
                    </StatusPill>
                  </div>
                  <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                    <span><strong className="font-medium">Email:</strong> {item.user.email}</span>
                    <span><strong className="font-medium">Phone:</strong> {item.user.phone || "N/A"}</span>
                  </div>
                  <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                    {renderDetails(item)}
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                  {item.verificationStatus === "APPROVED" ? (
                    <Button variant="secondary" fullWidth onClick={() => onAction(item.user.id, "REJECT")}>
                      Revoke Approval
                    </Button>
                  ) : (
                    <Button variant="secondary" fullWidth onClick={() => onAction(item.user.id, "APPROVE")}>
                      Re-Approve
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const TABS: { key: EntityKind; label: string }[] = [
  { key: "COLLECTOR", label: "Collectors" },
  { key: "RECYCLING_COMPANY", label: "Recycling Companies" },
  { key: "BUSINESS", label: "Businesses" },
];

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<EntityKind>("COLLECTOR");
  const [collectors, setCollectors] = React.useState<CollectorWithUser[]>([]);
  const [recyclingCompanies, setRecyclingCompanies] = React.useState<RecyclingCompanyWithUser[]>([]);
  const [businesses, setBusinesses] = React.useState<BusinessWithUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const fetchAll = React.useCallback(async () => {
    try {
      const [collectorsRes, recyclingRes, businessesRes] = await Promise.all([
        getCollectors(),
        getRecyclingCompanies(),
        getBusinesses(),
      ]);
      setCollectors(collectorsRes.collectors);
      setRecyclingCompanies(recyclingRes.recyclingCompanies);
      setBusinesses(businessesRes.businesses);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load pending verifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCollectorAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      await verifyCollector(id, action);
      setSuccessMsg(`Collector ${action === "APPROVE" ? "approved" : "rejected"}.`);
      fetchAll();
    } catch (err: any) {
      setError(err.message || "Failed to update collector.");
    }
  };

  const handleRecyclingAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      await verifyRecyclingCompany(id, action);
      setSuccessMsg(`Recycling company ${action === "APPROVE" ? "approved" : "rejected"}.`);
      fetchAll();
    } catch (err: any) {
      setError(err.message || "Failed to update recycling company.");
    }
  };

  const handleBusinessAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      await verifyBusiness(id, action);
      setSuccessMsg(`Business ${action === "APPROVE" ? "approved" : "rejected"}.`);
      fetchAll();
    } catch (err: any) {
      setError(err.message || "Failed to update business.");
    }
  };

  if (isLoading) {
    return <div className="text-neutral-500">Loading pending verifications...</div>;
  }

  const pendingCounts: Record<EntityKind, number> = {
    COLLECTOR: collectors.filter((c) => c.verificationStatus === "PENDING").length,
    RECYCLING_COMPANY: recyclingCompanies.filter((c) => c.verificationStatus === "PENDING").length,
    BUSINESS: businesses.filter((c) => c.verificationStatus === "PENDING").length,
  };

  return (
    <PageContainer className="py-8 lg:py-12">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Admin Dashboard</h1>
        <p className="mt-2 text-neutral-600">
          Review and verify new collector, recycling company, and business registrations.
        </p>
      </Card>

      {successMsg && (
        <div className="mb-8 p-4 bg-success-50 text-success-700 rounded-xl border border-success-200">
          {successMsg}
        </div>
      )}
      {error && <ErrorBanner title="Action failed" className="mb-8">{error}</ErrorBanner>}

      <div className="flex gap-2 mb-8 border-b border-neutral-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-3 text-body-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-neutral-500 hover:text-neutral-700",
            )}
          >
            {tab.label}
            {pendingCounts[tab.key] > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-semibold h-5 min-w-5 px-2">
                {pendingCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "COLLECTOR" && (
        <VerificationSection
          title="Verified Collectors"
          items={collectors}
          emptyPendingLabel="All caught up!"
          emptyVerifiedLabel="No verified collectors yet"
          onAction={handleCollectorAction}
          renderDetails={(c) => (
            <>
              <span><strong className="font-medium">Vehicle:</strong> {VEHICLE_TYPE_LABELS[c.vehicleType as keyof typeof VEHICLE_TYPE_LABELS]} ({c.vehicleNumber})</span>
              <span><strong className="font-medium">License:</strong> {c.licenseNumber}</span>
              <span><strong className="font-medium">Service Area:</strong> {c.serviceArea}</span>
            </>
          )}
        />
      )}

      {activeTab === "RECYCLING_COMPANY" && (
        <VerificationSection
          title="Verified Recycling Companies"
          items={recyclingCompanies}
          emptyPendingLabel="All caught up!"
          emptyVerifiedLabel="No verified recycling companies yet"
          onAction={handleRecyclingAction}
          renderDetails={(c) => (
            <>
              <span><strong className="font-medium">Company:</strong> {c.companyName}</span>
              <span><strong className="font-medium">Trade License:</strong> {c.tradeLicenseNumber || "N/A"}</span>
              <span><strong className="font-medium">District:</strong> {c.district}</span>
              <span><strong className="font-medium">Service Areas:</strong> {c.serviceAreas.length ? c.serviceAreas.join(", ") : "N/A"}</span>
            </>
          )}
        />
      )}

      {activeTab === "BUSINESS" && (
        <VerificationSection
          title="Verified Businesses"
          items={businesses}
          emptyPendingLabel="All caught up!"
          emptyVerifiedLabel="No verified businesses yet"
          onAction={handleBusinessAction}
          renderDetails={(b) => (
            <>
              <span><strong className="font-medium">Business:</strong> {b.businessName}</span>
              <span><strong className="font-medium">Trade License:</strong> {b.tradeLicenseNumber || "N/A"}</span>
            </>
          )}
        />
      )}
    </PageContainer>
  );
}
