"use client";

// Client Component for the same reasons as SustainabilityReportView: fetches
// user-specific data on mount and uses useRequireRole. Gated to USER-role
// accounts, same audience as the other personal-activity pages.
//
// Campaigns are intentionally hidden entirely until the user joins the
// community — joining isn't just a notification preference here, it's the
// gate to seeing campaigns at all.
import * as React from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Divider } from "@/components/Divider";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole, useAuth } from "@/lib/auth/AuthContext";
import { Leaf, Recycle, Users, CalendarDays, MapPin, PlayCircle, Sparkles } from "lucide-react";
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

// Rotating color themes for cards without a cover image — cycles through
// these so a grid of campaigns doesn't look monotone.
const CARD_THEMES = [
  { gradient: "from-emerald-50 to-green-50", icon: "text-emerald-600", bar: "bg-emerald-500" },
  { gradient: "from-sky-50 to-blue-50", icon: "text-sky-600", bar: "bg-sky-500" },
  { gradient: "from-amber-50 to-orange-50", icon: "text-amber-600", bar: "bg-amber-500" },
  { gradient: "from-fuchsia-50 to-purple-50", icon: "text-fuchsia-600", bar: "bg-fuchsia-500" },
];

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
  const [isJoining, setIsJoining] = React.useState(false);

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

  // Only fetch campaign data once the user has actually joined — before
  // that, campaigns stay entirely hidden, not just unhighlighted.
  React.useEffect(() => {
    if (!user || !user.hasJoinedCampaignCommunity) return;
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

  async function handleJoinCommunity() {
    setIsJoining(true);
    setError(null);
    try {
      await joinCampaignCommunity();
      await refetchUser();
    } catch {
      setError("Couldn't join the community. Try again.");
    } finally {
      setIsJoining(false);
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
      <Card className="mb-8 rounded-2xl border-emerald-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8 shadow-sm">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-neutral-900">
          <Users className="h-8 w-8 text-emerald-600" />
          Community Campaigns
        </h1>
        <p className="mt-2 text-neutral-600">
          Join upcoming recycling campaigns and workshops — attend, volunteer, or just spread the
          word.
        </p>
      </Card>

      {error && <ErrorBanner className="mb-8">{error}</ErrorBanner>}

      {!user.hasJoinedCampaignCommunity ? (
        <Card className="flex flex-col items-center gap-4 rounded-2xl border-primary-100 bg-primary-50 p-10 text-center">
          <Sparkles className="h-8 w-8 text-primary-600" />
          <div>
            <p className="text-body-lg font-semibold text-neutral-900">
              Join the community to see upcoming campaigns
            </p>
            <p className="mt-1 text-body-sm text-neutral-600">
              Campaigns, workshops, and past highlight videos are only visible to community
              members — join to see what&apos;s coming up and get notified about new ones.
            </p>
          </div>
          <Button onClick={handleJoinCommunity} disabled={isJoining}>
            {isJoining ? "Joining…" : "Join the community"}
          </Button>
        </Card>
      ) : (
        <>
          {!campaigns && !error && (
            <p className="text-body-sm text-neutral-500">Loading campaigns…</p>
          )}

          {campaigns && campaigns.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-16 text-center shadow-none">
              <Users className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
              <p className="text-body font-medium text-neutral-900">No campaigns announced yet</p>
              <p className="mt-1 text-body-sm text-neutral-500">Check back soon.</p>
            </Card>
          )}

          {campaigns && campaigns.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {campaigns.map((campaign, i) => {
                const theme = CARD_THEMES[i % CARD_THEMES.length];
                const attending = isRegistered(campaign.id, "ATTENDEE");
                const volunteering = isRegistered(campaign.id, "VOLUNTEER");
                const progressPct = campaign.volunteersNeeded
                  ? Math.min(100, Math.round((campaign.volunteerCount / campaign.volunteersNeeded) * 100))
                  : null;

                return (
                  <Card key={campaign.id} className="overflow-hidden rounded-2xl p-0 shadow-sm">
                    {campaign.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URL, not a local asset next/image can optimize
                      <img
                        src={campaign.coverImageUrl}
                        alt=""
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${theme.gradient}`}>
                        <Recycle className={`h-8 w-8 ${theme.icon}`} />
                      </div>
                    )}

                    <div className="p-5">
                      <h2 className="text-body-lg font-semibold text-neutral-900">{campaign.title}</h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-neutral-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatEventDate(campaign.eventDate)}
                        </span>
                        {campaign.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {campaign.location}
                          </span>
                        )}
                      </p>
                      {campaign.description && (
                        <p className="mt-3 text-body-sm text-neutral-700">{campaign.description}</p>
                      )}

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-caption text-neutral-500">
                          <span>Volunteers</span>
                          <span>
                            {campaign.volunteerCount}
                            {campaign.volunteersNeeded ? ` / ${campaign.volunteersNeeded}` : ""}
                          </span>
                        </div>
                        {progressPct !== null && (
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className={`h-full rounded-full ${theme.bar}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                        <p className="mt-1 text-caption text-neutral-500">{campaign.attendeeCount} attending</p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Button
                          variant={attending ? "ghost" : "primary"}
                          size="sm"
                          className="flex-1"
                          disabled={pendingKey === `${campaign.id}-ATTENDEE`}
                          onClick={() => handleToggleRegistration(campaign.id, "ATTENDEE")}
                        >
                          {attending ? "Cancel attendance" : "Attend"}
                        </Button>
                        <Button
                          variant={volunteering ? "ghost" : "secondary"}
                          size="sm"
                          className="flex-1"
                          disabled={pendingKey === `${campaign.id}-VOLUNTEER`}
                          onClick={() => handleToggleRegistration(campaign.id, "VOLUNTEER")}
                        >
                          {volunteering ? "Cancel volunteering" : "Volunteer"}
                        </Button>
                      </div>
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {videos.map((video, i) => {
                const theme = CARD_THEMES[i % CARD_THEMES.length];
                return (
                  <a
                    key={video.id}
                    href={video.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="overflow-hidden rounded-2xl p-0 shadow-sm transition-shadow hover:shadow-md">
                      {video.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin-supplied external URL
                        <img src={video.thumbnailUrl} alt="" className="h-32 w-full object-cover" />
                      ) : (
                        <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${theme.gradient}`}>
                          <PlayCircle className={`h-8 w-8 ${theme.icon}`} />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="text-body-lg font-semibold text-neutral-900">{video.title}</h3>
                        {video.description && (
                          <p className="mt-1 text-caption text-neutral-500">{video.description}</p>
                        )}
                        <span className="mt-3 inline-flex items-center gap-1 text-body-sm font-medium text-primary-600">
                          <Leaf className="h-3.5 w-3.5" />
                          Watch video
                        </span>
                      </div>
                    </Card>
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}