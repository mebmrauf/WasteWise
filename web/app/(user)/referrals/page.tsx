"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { getReferralDashboard, ReferralDashboardData } from "@/lib/api/referrals";

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    getReferralDashboard()
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        setError(err.message || "Failed to load referral data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCopyCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode).then(() => {
        showToast("Referral code copied successfully.");
      });
    }
  };

  const handleShareLink = () => {
    if (data?.referralCode) {
      const link = `${window.location.origin}/signup?ref=${data.referralCode}`;
      if (navigator.share) {
        navigator.share({
          title: "Join WasteWise",
          text: "Use my referral code to join WasteWise and get 50 Green Points!",
          url: link,
        }).catch((err) => {
          if (err.name !== 'AbortError') {
            navigator.clipboard.writeText(link).then(() => {
              showToast("Referral link copied successfully.");
            });
          }
        });
      } else {
        navigator.clipboard.writeText(link).then(() => {
          showToast("Referral link copied successfully.");
        });
      }
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <p className="text-neutral-500">Loading referral program...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <p className="text-red-500">{error || "Something went wrong"}</p>
        </div>
      </PageContainer>
    );
  }

  const milestones = [
    { count: 10, reward: "100 Green Points" },
    { count: 20, reward: "300 Green Points" },
    { count: 30, reward: "Eco-friendly Tote Bag" },
    { count: 50, reward: "Tree Sapling + Community Recognition Badge" },
  ];

  return (
    <PageContainer>
      <div className="flex flex-col gap-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Referral Program</h1>
          <p className="mt-2 text-neutral-600">
            Invite your friends to WasteWise. They get 50 Green Points, and you get 100 Green Points after their first verified pickup (≥ 5kg).
          </p>
        </header>

        {/* My Referral Code */}
        <section>
          <Card className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100">
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">Your Referral Code</h2>
              <p className="text-sm text-emerald-700 mt-1">Share this code with your friends when they sign up.</p>
              <div className="mt-4 flex items-center gap-4 bg-white px-6 py-3 rounded-xl border border-emerald-200 shadow-sm">
                <span className="text-2xl font-mono font-bold tracking-widest text-emerald-600">
                  {data.referralCode}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button onClick={handleCopyCode} variant="secondary" className="w-full sm:w-auto min-w-[120px]">
                Copy Code
              </Button>
              <Button onClick={handleShareLink} className="w-full sm:w-auto min-w-[120px]">
                Share Link
              </Button>
            </div>
          </Card>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Friends Invited</h3>
            <p className="mt-2 text-4xl font-bold text-neutral-900">{data.friendsInvited}</p>
          </Card>
          <Card className="p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Successful Referrals</h3>
            <p className="mt-2 text-4xl font-bold text-emerald-600">{data.successfulReferrals}</p>
          </Card>
          <Card className="p-6 text-center shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-emerald-500 opacity-10 pointer-events-none" />
            <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Green Points Earned</h3>
            <p className="mt-2 text-4xl font-bold text-green-600">{data.referralPointsEarned}</p>
          </Card>
        </section>

        {/* Milestone Rewards */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Milestone Rewards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {milestones.map((m) => {
              const achieved = data.successfulReferrals >= m.count;
              const claimed = data.milestonesClaimed.includes(m.count);
              
              return (
                <Card 
                  key={m.count} 
                  className={`p-5 flex flex-col items-center text-center transition-all ${
                    achieved ? "border-emerald-500 bg-emerald-50/30" : "opacity-70 grayscale hover:grayscale-0"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 text-lg font-bold ${
                    achieved ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                  }`}>
                    {m.count}
                  </div>
                  <h4 className="font-medium text-sm text-neutral-900 mb-1">{m.reward}</h4>
                  <p className="text-xs text-neutral-500 mt-auto">
                    {claimed ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1 justify-center">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Claimed
                      </span>
                    ) : achieved ? (
                      <span className="text-emerald-600 font-medium">Achieved!</span>
                    ) : (
                      `${m.count - data.successfulReferrals} more to go`
                    )}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Referral History */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Referral History</h2>
          <Card className="overflow-hidden">
            {data.history.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                You haven't invited anyone yet. Share your code to get started!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Friend Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Registration Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">First Pickup Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Reward Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Green Points</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {data.history.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {item.friendName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {new Date(item.registrationDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.firstPickupStatus === "Completed" ? "bg-green-100 text-green-800" :
                            item.firstPickupStatus === "In Progress" ? "bg-blue-100 text-blue-800" :
                            "bg-neutral-100 text-neutral-800"
                          }`}>
                            {item.firstPickupStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.rewardStatus === "Rewarded" ? "bg-emerald-100 text-emerald-800" :
                            item.rewardStatus === "Pending Approval" ? "bg-amber-100 text-amber-800" :
                            "bg-neutral-100 text-neutral-800"
                          }`}>
                            {item.rewardStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 font-medium">
                          <span className={item.greenPointsEarned !== "0" ? "text-green-600" : ""}>
                            {item.greenPointsEarned}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-neutral-900 text-white px-4 py-3 rounded shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}
    </PageContainer>
  );
}
