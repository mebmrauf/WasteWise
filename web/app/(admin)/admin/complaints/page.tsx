"use client";

import * as React from "react";
import { getAllComplaints, updateComplaintStatus } from "@/lib/api/admin";
import type { Complaint } from "@/lib/api/complaints";
import { publicEnv } from "@/lib/env";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StatusPill } from "@/components/StatusPill";
import { PageContainer } from "@/components/PageContainer";
import { Megaphone, MessageSquare } from "lucide-react";
import { Modal } from "@/components/Modal";

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = React.useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [selectedComplaint, setSelectedComplaint] = React.useState<Complaint | null>(null);
  const [resolutionStatus, setResolutionStatus] = React.useState("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const fetchComplaints = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { complaints: data } = await getAllComplaints();
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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    setIsUpdating(true);
    setError(null);
    try {
      await updateComplaintStatus(selectedComplaint.id, resolutionStatus, resolutionNotes.trim() || undefined);
      setSuccessMsg("Complaint status updated successfully.");
      setSelectedComplaint(null);
      fetchComplaints();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update complaint status.");
    } finally {
      setIsUpdating(false);
    }
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
    <PageContainer className="py-8 lg:py-12">
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-orange-600" />
          Complaints Management
        </h1>
        <p className="mt-2 text-neutral-600">
          Review, investigate, and resolve user complaints across the platform.
        </p>
      </Card>

      {successMsg && (
        <div className="mb-8 p-4 bg-success-50 text-success-700 rounded-xl border border-success-200">
          {successMsg}
        </div>
      )}
      {error && <ErrorBanner title="Action failed" className="mb-8">{error}</ErrorBanner>}

      {complaints.length === 0 ? (
        <Card className="py-16 text-center flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl">
          <MessageSquare className="w-12 h-12 text-neutral-400 mb-4" />
          <p className="text-body font-medium text-neutral-900">No complaints found</p>
          <p className="text-body-sm text-neutral-500 mt-1">
            There are currently no complaints in the system.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {complaints.map((c) => (
            <Card key={c.id} className="p-6 bg-white border border-neutral-100 shadow-sm rounded-2xl">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-body-sm font-medium text-neutral-500">
                      ID: {c.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-body-sm text-neutral-400">•</span>
                    <span className="text-body-sm text-neutral-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <StatusPill tone={getStatusTone(c.status)}>
                      {c.status.replace("_", " ")}
                    </StatusPill>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                      <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Complainant</span>
                      <div className="text-body-sm font-medium text-neutral-900">{c.complainant?.fullName || "Unknown"}</div>
                      <div className="text-xs text-neutral-600">{c.complainant?.email}</div>
                    </div>
                    
                    <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                      <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Pickup Request / Against</span>
                      <div className="text-body-sm font-medium text-neutral-900">
                        {c.pickupRequest && c.pickupRequestId && `Pickup: ${c.pickupRequestId.slice(-6).toUpperCase()}`}
                        {c.bulkRequest && c.bulkRequestId && `Bulk Request: ${c.bulkRequestId.slice(0, 8).toUpperCase()}`}
                        {!c.pickupRequest && !c.bulkRequest && "General Complaint"}
                      </div>
                      {c.againstUser && (
                        <div className="text-xs text-neutral-600 mt-1">
                          Against: {c.againstUser.fullName} ({c.againstUser.email})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Description</span>
                    <div className="text-body-sm text-neutral-700 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                      {c.description}
                      {c.photos && c.photos.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {c.photos.map((photoUrl, idx) => (
                            <a 
                              key={idx} 
                              href={`${publicEnv.NEXT_PUBLIC_API_URL.replace("/api/v1", "")}${photoUrl}`} 
                              target="_blank" 
                              rel="noreferrer"
                            >
                              <img 
                                src={`${publicEnv.NEXT_PUBLIC_API_URL.replace("/api/v1", "")}${photoUrl}`} 
                                alt={`Attachment ${idx + 1}`} 
                                className="h-24 w-24 object-cover rounded-md border border-neutral-200" 
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {c.resolutionNotes && (
                    <div className="mb-4">
                      <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Resolution Notes</span>
                      <p className="text-body-sm text-primary-800 bg-primary-50 p-4 rounded-xl border border-primary-100">
                        {c.resolutionNotes}
                      </p>
                      <div className="text-xs text-neutral-500 mt-1">
                        Resolved by {c.resolvedByAdmin?.fullName} on {c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : ""}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-auto flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedComplaint(c);
                      setResolutionStatus(c.status === "OPEN" ? "IN_REVIEW" : c.status);
                      setResolutionNotes(c.resolutionNotes || "");
                    }}
                  >
                    Update Status
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedComplaint} onClose={() => setSelectedComplaint(null)} title="Update Complaint Status">
        <form onSubmit={handleUpdateStatus} className="flex flex-col gap-4 mt-4">
          <div>
            <label htmlFor="status" className="block text-body-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              id="status"
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              disabled={isUpdating}
            >
              <option value="OPEN">Open</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-body-sm font-medium text-neutral-700 mb-1">
              Resolution Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Internal notes or message to complainant..."
              disabled={isUpdating}
            />
            <p className="text-xs text-neutral-500 mt-1">
              These notes will be visible to the user and sent via notification.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setSelectedComplaint(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
