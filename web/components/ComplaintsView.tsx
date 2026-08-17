"use client";

import * as React from "react";
import { getMyComplaints, type Complaint } from "@/lib/api/complaints";
import { Card } from "./Card";
import { Button } from "./Button";
import { ErrorBanner } from "./ErrorBanner";
import { StatusPill } from "./StatusPill";
import { PageContainer } from "./PageContainer";
import { NewComplaintModal } from "./NewComplaintModal";
import { Megaphone, AlertCircle } from "lucide-react";

interface ComplaintsViewProps {
  limitedOptions?: boolean;
}

export function ComplaintsView({ limitedOptions = false }: ComplaintsViewProps) {
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const fetchComplaints = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { complaints: data } = await getMyComplaints();
      setComplaints(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load complaints.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSuccess = () => {
    setSuccessMsg("Complaint submitted successfully.");
    fetchComplaints();
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "OPEN": return "warning";
      case "IN_REVIEW": return "info";
      case "RESOLVED": return "success";
      case "DISMISSED": return "info";
      default: return "info";
    }
  };

  if (isLoading) {
    return <div className="p-8 text-neutral-500">Loading complaints...</div>;
  }

  return (
    <PageContainer className="py-8">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-emerald-600" />
            Complaints
          </h1>
          <p className="mt-2 text-neutral-600">
            File and track issues regarding your pickups.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          File a Complaint
        </Button>
      </Card>

      {successMsg && (
        <div className="mb-6 p-4 bg-success-50 text-success-700 rounded-xl border border-success-200">
          {successMsg}
        </div>
      )}

      {error && <ErrorBanner title="Failed to load" className="mb-6">{error}</ErrorBanner>}

      {complaints.length === 0 ? (
        <Card className="py-16 text-center flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl">
          <AlertCircle className="w-12 h-12 text-neutral-400 mb-4" />
          <p className="text-body font-medium text-neutral-900">No complaints filed</p>
          <p className="text-body-sm text-neutral-500 mt-1">
            If you experience issues with a pickup, you can report it here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {complaints.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <div className="text-body-sm font-medium text-neutral-500 mb-1">
                    Complaint ID: <span className="text-neutral-900">{c.id.slice(-6).toUpperCase()}</span> • {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-body font-medium text-neutral-900">
                    Pickup: {c.pickupRequestId ? c.pickupRequestId.slice(-6).toUpperCase() : "N/A"}
                  </div>
                </div>
                <StatusPill tone={getStatusTone(c.status)}>
                  {c.status.replace("_", " ")}
                </StatusPill>
              </div>

              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-body-sm text-neutral-700 mb-4">
                {c.description}
              </div>

              {c.resolutionNotes && (
                <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 mt-4">
                  <h4 className="text-body-sm font-semibold text-primary-900 mb-1">Admin Resolution</h4>
                  <p className="text-body-sm text-primary-800">{c.resolutionNotes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <NewComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        limitedOptions={limitedOptions}
      />
    </PageContainer>
  );
}
