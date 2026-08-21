"use client";

import * as React from "react";
import { getCampaigns } from "@/lib/api/campaigns";
import type { Campaign } from "@/lib/api/campaigns";
import { createCampaign, deleteCampaign, getCampaignRegistrations, createCampaignVideo } from "@/lib/api/adminCampaigns";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";
import { Users } from "lucide-react";
import { Modal } from "@/components/Modal";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [viewingRegistrationsFor, setViewingRegistrationsFor] = React.useState<Campaign | null>(null);
  const [registrations, setRegistrations] = React.useState<
    Awaited<ReturnType<typeof getCampaignRegistrations>>["registrations"]
  >([]);

  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);
  const [isSavingVideo, setIsSavingVideo] = React.useState(false);

  const fetchCampaigns = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { campaigns: data } = await getCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await createCampaign({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? "") || undefined,
        location: String(formData.get("location") ?? "") || undefined,
        eventDate: new Date(String(formData.get("eventDate") ?? "")).toISOString(),
        volunteersNeeded: formData.get("volunteersNeeded")
          ? Number(formData.get("volunteersNeeded"))
          : undefined,
      });
      setSuccessMsg("Campaign created successfully.");
      setIsCreateOpen(false);
      fetchCampaigns();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to create campaign.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    setError(null);
    try {
      await deleteCampaign(id);
      setSuccessMsg("Campaign deleted.");
      fetchCampaigns();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to delete campaign.");
    }
  };

  const handleViewRegistrations = async (campaign: Campaign) => {
    setViewingRegistrationsFor(campaign);
    try {
      const { registrations: data } = await getCampaignRegistrations(campaign.id);
      setRegistrations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load registrations.");
    }
  };

  const handleCreateVideo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingVideo(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      await createCampaignVideo({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? "") || undefined,
        videoUrl: String(formData.get("videoUrl") ?? ""),
        campaignId: String(formData.get("campaignId") ?? "") || undefined,
      });
      setSuccessMsg("Video added successfully.");
      setIsVideoModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || "Failed to add video.");
    } finally {
      setIsSavingVideo(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-neutral-500">Loading campaigns...</div>;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-emerald-600" />
          Community Campaigns
        </h1>
        <p className="mt-2 text-neutral-600">
          Create and manage recycling campaigns and workshops for the community.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => setIsCreateOpen(true)}>New Campaign</Button>
          <Button variant="secondary" onClick={() => setIsVideoModalOpen(true)}>
            Add Highlight Video
          </Button>
        </div>
      </Card>

      {successMsg && (
        <div className="mb-8 p-4 bg-success-50 text-success-700 rounded-xl border border-success-200">
          {successMsg}
        </div>
      )}
      {error && <ErrorBanner title="Action failed" className="mb-8">{error}</ErrorBanner>}

      {campaigns.length === 0 ? (
        <Card className="py-16 text-center flex flex-col items-center justify-center bg-neutral-50 border border-dashed border-neutral-300 shadow-none rounded-2xl">
          <Users className="w-12 h-12 text-neutral-400 mb-4" />
          <p className="text-body font-medium text-neutral-900">No campaigns yet</p>
          <p className="text-body-sm text-neutral-500 mt-1">Create your first campaign above.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-6 bg-white border border-neutral-100 shadow-sm rounded-2xl">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-body-lg font-semibold text-neutral-900">{c.title}</h2>
                    <span className="text-body-sm text-neutral-400">•</span>
                    <span className="text-body-sm text-neutral-500">
                      {new Date(c.eventDate).toLocaleDateString()}
                    </span>
                  </div>
                  {c.location && <p className="text-body-sm text-neutral-600">{c.location}</p>}
                  {c.description && (
                    <p className="mt-2 text-body-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                      {c.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    {c.attendeeCount} attending
                    {c.volunteersNeeded ? ` — ${c.volunteerCount}/${c.volunteersNeeded} volunteers` : ` — ${c.volunteerCount} volunteers`}
                  </p>
                </div>
                <div className="w-full lg:w-auto flex flex-col gap-2">
                  <Button variant="secondary" onClick={() => handleViewRegistrations(c)}>
                    View Registrations
                  </Button>
                  <Button variant="secondary" onClick={() => handleDelete(c.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Campaign">
        <form onSubmit={handleCreate} className="flex flex-col gap-4 mt-4">
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Title</label>
            <input
              name="title"
              required
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Location</label>
            <input
              name="location"
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Event date</label>
            <input
              name="eventDate"
              type="datetime-local"
              required
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSaving}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Volunteers needed (optional)</label>
            <input
              name="volunteersNeeded"
              type="number"
              min={1}
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSaving}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? "Creating…" : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingRegistrationsFor}
        onClose={() => setViewingRegistrationsFor(null)}
        title={`Registrations — ${viewingRegistrationsFor?.title ?? ""}`}
      >
        <div className="mt-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
          {registrations.length === 0 && (
            <p className="text-body-sm text-neutral-500">No one has registered yet.</p>
          )}
          {registrations.map((r) => (
            <div key={r.id} className="flex justify-between items-center bg-neutral-50 p-3 rounded-lg border border-neutral-100">
              <div>
                <p className="text-body-sm font-medium text-neutral-900">{r.user.fullName}</p>
                <p className="text-xs text-neutral-500">{r.user.email}</p>
              </div>
              <span className="text-xs font-semibold text-neutral-600 uppercase">{r.type}</span>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} title="Add Highlight Video">
        <form onSubmit={handleCreateVideo} className="flex flex-col gap-4 mt-4">
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Title</label>
            <input
              name="title"
              required
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSavingVideo}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSavingVideo}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Video URL</label>
            <input
              name="videoUrl"
              type="url"
              required
              placeholder="https://youtube.com/watch?v=..."
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSavingVideo}
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-neutral-700 mb-1">Related campaign ID (optional)</label>
            <input
              name="campaignId"
              className="w-full rounded-xl border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-body"
              disabled={isSavingVideo}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" type="button" onClick={() => setIsVideoModalOpen(false)} disabled={isSavingVideo}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSavingVideo}>
              {isSavingVideo ? "Saving…" : "Add Video"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}