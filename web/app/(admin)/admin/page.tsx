"use client";

import * as React from "react";
import { getCollectors, verifyCollector, type CollectorWithUser } from "@/lib/api/admin";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StatusPill } from "@/components/StatusPill";
import { VEHICLE_TYPE_LABELS } from "@/lib/vehicleType";

export default function AdminDashboardPage() {
  const [collectors, setCollectors] = React.useState<CollectorWithUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCollectors();
  }, []);

  const fetchCollectors = async () => {
    try {
      const res = await getCollectors();
      setCollectors(res.collectors);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load pending collectors.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      await verifyCollector(id, action);
      setSuccessMsg(`Collector ${action === "APPROVE" ? "approved" : "rejected"}.`);
      fetchCollectors();
    } catch (err: any) {
      setError(err.message || "Failed to update collector.");
    }
  };

  if (isLoading) {
    return <div className="text-neutral-500">Loading pending collectors...</div>;
  }

  return (
    <div>
      <h1 className="text-h2 mb-2 text-neutral-900">Pending Approvals</h1>
      <p className="text-body text-neutral-500 mb-8">Review and verify new collector registrations.</p>

      {successMsg && (
        <div className="mb-8 p-4 bg-success-50 text-success-700 rounded-xl border border-success-200">
          {successMsg}
        </div>
      )}
      {error && <ErrorBanner title="Action failed" className="mb-8">{error}</ErrorBanner>}

      <div className="flex flex-col gap-12">
        {/* Pending Section */}
        <section>
          <h2 className="text-h3 text-neutral-900 mb-4">Awaiting Verification</h2>
          {collectors.filter(c => c.verificationStatus === "PENDING").length === 0 ? (
            <Card className="py-12 text-center flex flex-col items-center justify-center bg-neutral-50/50">
              <p className="text-body font-medium text-neutral-900">No pending approvals</p>
              <p className="text-body-sm text-neutral-500 mt-1">All caught up!</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {collectors.filter(c => c.verificationStatus === "PENDING").map((c) => (
                <Card key={c.user.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-l-4 border-l-warning-500">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-body font-medium text-neutral-900">{c.user.fullName}</h3>
                      <StatusPill tone="warning">Pending Verification</StatusPill>
                    </div>
                    <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                      <span><strong className="font-medium">Email:</strong> {c.user.email}</span>
                      <span><strong className="font-medium">Phone:</strong> {c.user.phone || "N/A"}</span>
                    </div>
                    <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                      <span><strong className="font-medium">Vehicle:</strong> {VEHICLE_TYPE_LABELS[c.vehicleType as keyof typeof VEHICLE_TYPE_LABELS]} ({c.vehicleNumber})</span>
                      <span><strong className="font-medium">License:</strong> {c.licenseNumber}</span>
                      <span><strong className="font-medium">Service Area:</strong> {c.serviceArea}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <Button variant="secondary" fullWidth onClick={() => handleAction(c.user.id, "REJECT")}>
                      Reject
                    </Button>
                    <Button variant="primary" fullWidth onClick={() => handleAction(c.user.id, "APPROVE")}>
                      Approve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Approved/Rejected Section */}
        <section>
          <h2 className="text-h3 text-neutral-900 mb-4">Verified Collectors</h2>
          {collectors.filter(c => c.verificationStatus !== "PENDING").length === 0 ? (
            <Card className="py-12 text-center flex flex-col items-center justify-center bg-neutral-50/50 border-dashed">
              <p className="text-body font-medium text-neutral-500">No verified collectors yet</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {collectors.filter(c => c.verificationStatus !== "PENDING").map((c) => (
                <Card key={c.user.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-l-4 ${c.verificationStatus === 'APPROVED' ? 'border-l-success-500' : 'border-l-error-500'}`}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-body font-medium text-neutral-900">{c.user.fullName}</h3>
                      <StatusPill tone={c.verificationStatus === "APPROVED" ? "success" : "error"}>
                        {c.verificationStatus === "APPROVED" ? "Approved" : "Rejected"}
                      </StatusPill>
                    </div>
                    <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                      <span><strong className="font-medium">Email:</strong> {c.user.email}</span>
                      <span><strong className="font-medium">Phone:</strong> {c.user.phone || "N/A"}</span>
                    </div>
                    <div className="text-body-sm text-neutral-600 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                      <span><strong className="font-medium">Vehicle:</strong> {VEHICLE_TYPE_LABELS[c.vehicleType as keyof typeof VEHICLE_TYPE_LABELS]} ({c.vehicleNumber})</span>
                      <span><strong className="font-medium">License:</strong> {c.licenseNumber}</span>
                      <span><strong className="font-medium">Service Area:</strong> {c.serviceArea}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {c.verificationStatus === "APPROVED" ? (
                      <Button variant="secondary" fullWidth onClick={() => handleAction(c.user.id, "REJECT")}>
                        Revoke Approval
                      </Button>
                    ) : (
                      <Button variant="secondary" fullWidth onClick={() => handleAction(c.user.id, "APPROVE")}>
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
    </div>
  );
}