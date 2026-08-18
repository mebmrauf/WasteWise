"use client";

import * as React from "react";
import {
  getWasteAnalysisReports,
  getWasteAnalysisSummary,
  updateWasteAnalysisReview,
  deleteWasteAnalysisReports,
  type WasteAnalysisReport,
  type WasteAnalysisSummary,
  type WasteAnalysisSummaryBucket,
  type WasteAnalysisTopClassified,
} from "@/lib/api/admin";
import { publicEnv } from "@/lib/env";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { StatusPill } from "@/components/StatusPill";
import { PageContainer } from "@/components/PageContainer";
import { Sparkles, ScanSearch, X } from "lucide-react";

const UPLOAD_BASE_URL = publicEnv.NEXT_PUBLIC_API_URL.replace("/api/v1", "");

type RequesterTab = "HOUSEHOLD" | "BUSINESS";

const EMPTY_BUCKET: WasteAnalysisSummaryBucket = { byCategory: {}, byCondition: {}, byUsagePeriod: {} };
const EMPTY_SUMMARY: WasteAnalysisSummary = { HOUSEHOLD: EMPTY_BUCKET, BUSINESS: EMPTY_BUCKET };
const EMPTY_TOP_CLASSIFIED: WasteAnalysisTopClassified = { HOUSEHOLD: {}, BUSINESS: {} };

function formatLabel(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}

export default function AdminWasteAnalysisPage() {
  const [reports, setReports] = React.useState<WasteAnalysisReport[]>([]);
  const [summary, setSummary] = React.useState<WasteAnalysisSummary>(EMPTY_SUMMARY);
  const [topClassified, setTopClassified] = React.useState<WasteAnalysisTopClassified>(EMPTY_TOP_CLASSIFIED);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<RequesterTab>("HOUSEHOLD");

  const [selectedReport, setSelectedReport] = React.useState<WasteAnalysisReport | null>(null);
  const [reviewDecision, setReviewDecision] = React.useState<"REVIEWED" | "DISMISSED">("REVIEWED");
  const [reviewNotes, setReviewNotes] = React.useState("");
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = React.useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      if (next.length === 0) setIsConfirmingBulkDelete(false);
      return next;
    });
  };

  const fetchReports = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ reports: data }, { summary: summaryData, topClassified: topClassifiedData }] = await Promise.all([
        getWasteAnalysisReports(),
        getWasteAnalysisSummary(),
      ]);
      setReports(data);
      setSummary(summaryData);
      setTopClassified(topClassifiedData);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load waste analysis reports.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsUpdating(true);
    setError(null);
    try {
      const { deleted } = await updateWasteAnalysisReview(selectedReport.id, reviewDecision, reviewNotes.trim() || undefined);
      setSuccessMsg(deleted ? "Report dismissed and removed." : "Report marked as reviewed.");
      setSelectedReport(null);
      fetchReports();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to update report.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsUpdating(true);
    setError(null);
    try {
      await deleteWasteAnalysisReports(selectedIds);
      setSuccessMsg(`Permanently deleted ${selectedIds.length} report(s).`);
      setSelectedIds([]);
      setIsConfirmingBulkDelete(false);
      fetchReports();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to delete reports.");
    } finally {
      setIsUpdating(false);
    }
  };


  const getStatusTone = (status: string) => {
    switch (status) {
      case "PENDING": return "warning";
      case "REVIEWED": return "success";
      case "DISMISSED": return "neutral";
      default: return "info";
    }
  };

  const householdReports = reports.filter((r) => r.requester?.accountType !== "BUSINESS");
  const businessReports = reports.filter((r) => r.requester?.accountType === "BUSINESS");
  const visibleReports = activeTab === "HOUSEHOLD" ? householdReports : businessReports;
  const visibleSummary = summary[activeTab];
  const categoryEntries = Object.entries(visibleSummary.byCategory).sort((a, b) => b[1] - a[1]);
  const conditionEntries = Object.entries(visibleSummary.byCondition).sort((a, b) => b[1] - a[1]);
  const usagePeriodEntries = Object.entries(visibleSummary.byUsagePeriod).sort((a, b) => b[1] - a[1]);
  const totalClassified = categoryEntries.reduce((sum, [, count]) => sum + count, 0);
  const visibleTopClassified = topClassified[activeTab];
  const galleryCategories = Object.entries(visibleTopClassified).sort(
    (a, b) => (visibleSummary.byCategory[b[0]] ?? 0) - (visibleSummary.byCategory[a[0]] ?? 0),
  );

  const needsReviewGroups = React.useMemo(() => {
    const groups = new Map<string, WasteAnalysisReport[]>();
    for (const r of visibleReports) {
      const key = r.suggestedCategory ?? "UNCERTAIN";
      const existing = groups.get(key) ?? [];
      existing.push(r);
      groups.set(key, existing);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [visibleReports]);

  if (isLoading) {
    return <div className="p-8 text-neutral-500">Loading waste analysis reports...</div>;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 border-indigo-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-600" />
          Waste Analysis Review
        </h1>
        <p className="mt-2 text-neutral-600">
          AI analysis results for Smart Pickup and Bulk Pickup submissions — both confidently classified items and
          ones that need your review before deciding whether the category list needs to change.
        </p>
      </Card>

      {successMsg && (
        <div className="mb-8 p-4 bg-success-50 text-success-700 rounded-xl border border-success-200">
          {successMsg}
        </div>
      )}
      {error && <ErrorBanner title="Action failed" className="mb-8">{error}</ErrorBanner>}

      <div className="flex gap-4 border-b border-neutral-200 mb-8">
        <button
          onClick={() => setActiveTab("HOUSEHOLD")}
          className={`pb-2 px-2 text-body font-medium transition-colors border-b-2 ${activeTab === "HOUSEHOLD" ? "border-primary-500 text-primary-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
        >
          Household ({householdReports.length})
        </button>
        <button
          onClick={() => setActiveTab("BUSINESS")}
          className={`pb-2 px-2 text-body font-medium transition-colors border-b-2 ${activeTab === "BUSINESS" ? "border-primary-500 text-primary-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
        >
          Business ({businessReports.length})
        </button>
      </div>

      <div className="mb-10">
        <h2 className="text-h4 text-neutral-900 mb-1">Confidently classified</h2>
        <p className="text-body-sm text-neutral-500 mb-4">
          Items the AI matched to an existing category with no review needed.
        </p>
        {totalClassified === 0 ? (
          <Card className="p-6 bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl text-center">
            <p className="text-body-sm text-neutral-500">No confidently classified items yet.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">By category</h3>
                <div className="flex flex-col gap-2">
                  {categoryEntries.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2">
                      <span className="text-body-sm font-medium text-neutral-700 capitalize">{formatLabel(category)}</span>
                      <span className="text-body-sm font-semibold text-primary-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">By condition</h3>
                <div className="flex flex-col gap-2">
                  {conditionEntries.map(([condition, count]) => (
                    <div key={condition} className="flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2">
                      <span className="text-body-sm font-medium text-neutral-700 capitalize">{formatLabel(condition)}</span>
                      <span className="text-body-sm font-semibold text-primary-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase mb-2">By time-to-disposal</h3>
                <div className="flex flex-col gap-2">
                  {usagePeriodEntries.map(([period, count]) => (
                    <div key={period} className="flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-2">
                      <span className="text-body-sm font-medium text-neutral-700 capitalize">{formatLabel(period)}</span>
                      <span className="text-body-sm font-semibold text-primary-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {galleryCategories.length > 0 && (
              <div className="flex flex-col gap-8">
                {galleryCategories.map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-body font-semibold text-neutral-900 capitalize mb-3">
                      {formatLabel(category)}{" "}
                      <span className="text-body-sm font-normal text-neutral-500">
                        (highest-confidence examples, {items.length} of {visibleSummary.byCategory[category] ?? items.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {items.map((item) => (
                        <div key={item.id} className="relative block rounded-xl border border-neutral-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(item);
                              setReviewDecision(item.reviewStatus === "DISMISSED" ? "DISMISSED" : "REVIEWED");
                              setReviewNotes(item.reviewNotes || "");
                            }}
                            className="text-left w-full h-full block focus-visible:outline-none"
                          >
                            <img
                              src={`${UPLOAD_BASE_URL}${item.photoUrls[0]}`}
                              alt={`${category} example`}
                              className="w-full h-[140px] object-cover"
                            />
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-primary-700">
                                  {item.confidence !== null ? `${Math.round(item.confidence * 100)}%` : ""}
                                </span>
                                {item.detectedCondition && (
                                  <span className="text-xs text-neutral-500 capitalize truncate ml-1">{formatLabel(item.detectedCondition)}</span>
                                )}
                              </div>
                              {item.estimatedUsagePeriod && (
                                <p className="mt-1 text-xs text-neutral-400 capitalize truncate">{formatLabel(item.estimatedUsagePeriod)}</p>
                              )}
                            </div>
                          </button>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="absolute top-2 right-2 w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer shadow-sm bg-white/80"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mb-4">
        <h2 className="text-h4 text-neutral-900 mb-1">Needs review</h2>
        <p className="text-body-sm text-neutral-500">
          Items the AI couldn&apos;t confidently classify — review each one to decide if the category list needs to change.
        </p>
      </div>

      {visibleReports.length === 0 ? (
        <Card className="py-16 text-center flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl">
          <ScanSearch className="w-12 h-12 text-neutral-400 mb-4" />
          <p className="text-body font-medium text-neutral-900">Nothing needs review</p>
          <p className="text-body-sm text-neutral-500 mt-1">
            Uncertain classifications from {activeTab === "HOUSEHOLD" ? "household" : "business"} pickup submissions will show up here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {needsReviewGroups.map(([category, items]) => (
            <div key={category}>
              <h3 className="text-body font-semibold text-neutral-900 capitalize mb-3">
                {category === "UNCERTAIN" ? "No category suggested" : formatLabel(category)}{" "}
                <span className="text-body-sm font-normal text-neutral-500">({items.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {items.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => toggleSelection(r.id)}
                      className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 cursor-pointer shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(r);
                        setReviewDecision(r.reviewStatus === "DISMISSED" ? "DISMISSED" : "REVIEWED");
                        setReviewNotes(r.reviewNotes || "");
                      }}
                      className="text-left flex items-center justify-between gap-4 px-4 py-3 bg-white border border-neutral-100 rounded-xl shadow-sm hover:border-primary-200 hover:shadow-md transition-all flex-1"
                    >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusPill tone={getStatusTone(r.reviewStatus)}>{r.reviewStatus}</StatusPill>
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-neutral-900 truncate">{r.requester?.fullName || "Unknown"}</p>
                        {r.reviewReason && <p className="text-xs text-neutral-500 truncate">{r.reviewReason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.confidence !== null && (
                        <span className="text-xs text-neutral-400">{Math.round(r.confidence * 100)}%</span>
                      )}
                      <span className="text-xs text-neutral-400 hidden sm:inline">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-body-sm font-medium text-primary-600">
                        {r.reviewStatus === "PENDING" ? "Review" : "Update"}
                      </span>
                    </div>
                  </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 shrink-0">
              <h2 className="text-h4 text-neutral-900">Waste Analysis Detail</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)} aria-label="Close">
                <X className="w-5 h-5 text-neutral-500" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-body-sm font-medium text-neutral-500">ID: {selectedReport.id.slice(-6).toUpperCase()}</span>
                <span className="text-body-sm text-neutral-400">•</span>
                <span className="text-body-sm text-neutral-500">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                <StatusPill tone={getStatusTone(selectedReport.reviewStatus)}>{selectedReport.reviewStatus}</StatusPill>
                {selectedReport.suggestedCategory && (
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                    Suggested: {selectedReport.suggestedCategory}
                  </span>
                )}
                {selectedReport.confidence !== null && (
                  <span className="text-xs text-neutral-400">{Math.round(selectedReport.confidence * 100)}% confidence</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Requester</span>
                  <div className="text-body-sm font-medium text-neutral-900">{selectedReport.requester?.fullName || "Unknown"}</div>
                  <div className="text-xs text-neutral-600">{selectedReport.requester?.email}</div>
                </div>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                  <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Related Request</span>
                  <div className="text-body-sm font-medium text-neutral-900">
                    {selectedReport.pickupRequest && selectedReport.pickupRequestId && `Pickup: ${selectedReport.pickupRequestId.slice(-6).toUpperCase()}`}
                    {selectedReport.bulkRequest && selectedReport.bulkRequestId && `Bulk Request: ${selectedReport.bulkRequestId.slice(0, 8).toUpperCase()}`}
                    {!selectedReport.pickupRequest && !selectedReport.bulkRequest && "Unknown"}
                  </div>
                </div>
              </div>

              {(selectedReport.detectedCondition || selectedReport.estimatedUsagePeriod) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm">
                  {selectedReport.detectedCondition && (
                    <div>
                      <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Condition</span>
                      <span className="text-neutral-700 capitalize">{formatLabel(selectedReport.detectedCondition)}</span>
                    </div>
                  )}
                  {selectedReport.estimatedUsagePeriod && (
                    <div>
                      <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Time to disposal</span>
                      <span className="text-neutral-700 capitalize">{formatLabel(selectedReport.estimatedUsagePeriod)}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedReport.reviewReason && (
                <div>
                  <span className="text-xs font-semibold text-amber-600 uppercase block mb-1">Why it needs review</span>
                  <p className="text-body-sm text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    {selectedReport.reviewReason}
                  </p>
                </div>
              )}

              {selectedReport.aiSummary && (
                <div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">AI Summary</span>
                  <p className="text-body-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                    {selectedReport.aiSummary}
                  </p>
                </div>
              )}

              {selectedReport.description && (
                <div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">User Description</span>
                  <p className="text-body-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {selectedReport.photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedReport.photoUrls.map((photoUrl, idx) => (
                    <button key={idx} type="button" onClick={() => setPreviewUrl(`${UPLOAD_BASE_URL}${photoUrl}`)}>
                      <img
                        src={`${UPLOAD_BASE_URL}${photoUrl}`}
                        alt={`Attachment ${idx + 1}`}
                        className="h-24 w-24 object-cover rounded-md border border-neutral-200 hover:opacity-90 transition-opacity"
                      />
                    </button>
                  ))}
                </div>
              )}

              {selectedReport.reviewNotes && (
                <div>
                  <span className="text-xs font-semibold text-neutral-500 uppercase block mb-1">Previous Admin Notes</span>
                  <p className="text-body-sm text-primary-800 bg-primary-50 p-4 rounded-xl border border-primary-100">
                    {selectedReport.reviewNotes}
                  </p>
                  <div className="text-xs text-neutral-500 mt-1">
                    Reviewed by {selectedReport.reviewedByAdmin?.fullName} on {selectedReport.reviewedAt ? new Date(selectedReport.reviewedAt).toLocaleDateString() : ""}
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdateReview} className="flex flex-col gap-4 pt-4 border-t border-neutral-100">
                <div>
                  <label htmlFor="decision" className="block text-body-sm font-medium text-neutral-700 mb-1">
                    Decision
                  </label>
                  <select
                    id="decision"
                    className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
                    value={reviewDecision}
                    onChange={(e) => setReviewDecision(e.target.value as "REVIEWED" | "DISMISSED")}
                    disabled={isUpdating}
                  >
                    <option value="REVIEWED">Reviewed (category taxonomy addressed)</option>
                    <option value="DISMISSED">Dismissed (delete this report)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reviewNotes" className="block text-body-sm font-medium text-neutral-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="reviewNotes"
                    rows={3}
                    className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="e.g. added a new 'TEXTILE' category to cover this..."
                    disabled={isUpdating}
                  />
                </div>

                <div className="flex justify-end gap-3 items-center">
                  <Button variant="secondary" type="button" onClick={() => setSelectedReport(null)} disabled={isUpdating}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={isUpdating}>
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewUrl(null)}
            aria-label="Close preview"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewUrl}
            alt="Full-size preview"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-40 flex items-center justify-between px-8">
          <span className="text-body font-medium text-neutral-900">
            {selectedIds.length} item{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-3 items-center">
            {isConfirmingBulkDelete ? (
              <>
                <span className="text-body-sm font-medium text-error-600 mr-2 hidden sm:inline">
                  Are you sure? This cannot be undone.
                </span>
                <Button variant="secondary" onClick={() => setIsConfirmingBulkDelete(false)} disabled={isUpdating}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={isUpdating}>
                  {isUpdating ? "Deleting..." : "Yes, Delete"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => {
                  setSelectedIds([]);
                  setIsConfirmingBulkDelete(false);
                }} disabled={isUpdating}>
                  Deselect All
                </Button>
                <Button variant="destructive" onClick={() => setIsConfirmingBulkDelete(true)} disabled={isUpdating}>
                  Delete Selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
