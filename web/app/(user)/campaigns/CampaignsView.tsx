"use client";

// Client Component for the same reasons as SustainabilityReportView: fetches
// user-specific data on mount and uses useRequireRole. Gated to USER-role
// accounts, same audience as the other personal-activity pages.
import * as React from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole, useAuth } from "@/lib/auth/AuthContext";
import {
  getCampaigns,
  getMyCampaignRegistrations,
  registerForCampaign,
  unregisterFromCampaign,
  getCampaignVideos,
  joinCampaignCommunity,
  type Campaign,
  type CampaignRegistration,
  type CampaignVideo,
} from "@/lib/api/campaigns";

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CampaignsView() {
  const { user, isLoading } = useRequireRole(["USER"]);
  const { refetchUser } = useAuth();

  const [campaigns, setCampaigns] = React.useState<Campaign[] | null>(null);
  const [myRegistrations, setMyRegistrations] = React.useState<CampaignRegistration[] | null>(null);
  const [videos, setVideos] = React.useState<CampaignVideo[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  const loadAll = React.useCallback(() => {
    setError(null);
    Promise.all([getCampaigns(), getMyCampaignRegistrations(), getCampaignVideos()])
      .then(([c, r, v]) => {
        setCampaigns(c.campaigns);
        setMyRegistrations(r.registrations);
        setVideos(v.videos);
      })
      .catch(() => setError("Couldn't load campaigns. Try refreshing the page."));
  }, []);

  React.useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user, loadAll]);

  function isRegistered(campaignId: string, type: "ATTENDEE" | "VOLUNTEER"): boolean {
    return Boolean(myRegistrations?.some((r) => r.campaignId === campaignId && r.type === type));
  }

  async function handleToggleRegistration(campaignId: string, type: "ATTENDEE" | "VOLUNTEER") {
    const key = `${campaignId}-${type}`;
    setPendingKey(key);
    setError(null);
    try {
      if (isRegistered(campaignId, type)) {
        await unregisterFromCampaign(campaignId, type);
      } else {
        await registerForCampaign(campaignId, type);
      }
      loadAll();
    } catch {
      setError("Couldn't update your registration. Try again.");
    } finally {
      setPendingKey(null);
    }
  }

  if (isLoading) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-body-sm text-neutral-500">Loading…</p>
      </PageContainer>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <h1 className="text-h1 text-neutral-900">Community Campaigns</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Join upcoming recycling campaigns and workshops — attend, volunteer, or just spread the
        word.
      </p>

      {!user.hasJoinedCampaignCommunity && (
        <Card className="mt-8 max-w-form">
          <p className="text-body-sm text-neutral-900">
            You haven&apos;t joined the campaign community yet — join to get notified whenever a
            new campaign is announced.
          </p>
          <Button
            className="mt-4"
            onClick={async () => {
              await joinCampaignCommunity();
              await refetchUser();
            }}
          >
            Join the community
          </Button>
        </Card>
      )}

      {error && <ErrorBanner className="mt-8 max-w-form">{error}</ErrorBanner>}

      {!campaigns && !error && (
        <p className="mt-8 text-body-sm text-neutral-500">Loading campaigns…</p>
      )}

      {campaigns && campaigns.length === 0 && (
        <Card className="mt-8 max-w-form">
          <p className="text-body-sm text-neutral-500">
            No campaigns announced yet — check back soon.
          </p>
        </Card>
      )}

      {campaigns && campaigns.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {campaigns.map((campaign) => {
            const attending = isRegistered(campaign.id, "ATTENDEE");
            const volunteering = isRegistered(campaign.id, "VOLUNTEER");
            return (
              <Card key={campaign.id} className="max-w-form">
                <h2 className="text-h3 text-neutral-900">{campaign.title}</h2>
                <p className="mt-1 text-caption text-neutral-500">
                  {formatEventDate(campaign.eventDate)}
                  {campaign.location ? ` — ${campaign.location}` : ""}
                </p>
                {campaign.description && (
                  <p className="mt-3 text-body-sm text-neutral-700">{campaign.description}</p>
                )}
                <p className="mt-3 text-caption text-neutral-500">
                  {campaign.attendeeCount} attending
                  {campaign.volunteersNeeded
                    ? ` — ${campaign.volunteerCount}/${campaign.volunteersNeeded} volunteers`
                    : ` — ${campaign.volunteerCount} volunteers`}
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant={attending ? "ghost" : "primary"}
                    size="sm"
                    disabled={pendingKey === `${campaign.id}-ATTENDEE`}
                    onClick={() => handleToggleRegistration(campaign.id, "ATTENDEE")}
                  >
                    {attending ? "Cancel attendance" : "Register to attend"}
                  </Button>
                  <Button
                    variant={volunteering ? "ghost" : "primary"}
                    size="sm"
                    disabled={pendingKey === `${campaign.id}-VOLUNTEER`}
                    onClick={() => handleToggleRegistration(campaign.id, "VOLUNTEER")}
                  >
                    {volunteering ? "Cancel volunteering" : "Volunteer for this"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Divider label="Past campaign highlights" className="my-10" />

      {videos && videos.length === 0 && (
        <p className="text-body-sm text-neutral-500">No videos posted yet.</p>
      )}

      {videos && videos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <Card key={video.id} className="max-w-form">
              <h3 className="text-body-lg text-neutral-900">{video.title}</h3>
              {video.description && (
                <p className="mt-1 text-caption text-neutral-500">{video.description}</p>
              )}
              <a
                              
                href={video.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-body-sm text-primary-600 underline"
              >
                Watch video →
              </a>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}