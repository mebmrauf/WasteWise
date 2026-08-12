"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { authFetch } from "@/lib/api/auth";
import { Loader2, Camera, MapPin, Building, FileText, Phone, Mail, CheckCircle2, AlertCircle, Bell } from "lucide-react";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Icon } from "@/components/Icon";
import { getMyProfile, updateMyProfile, type UpdateProfileInput } from "@/lib/api/users";

interface NotificationPrefs {
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  rewardsEmailNotificationsEnabled: boolean;
}

const notificationPreferenceKeys = {
  email: "emailNotificationsEnabled",
  sms: "smsNotificationsEnabled",
  rewardsEmail: "rewardsEmailNotificationsEnabled",
} as const;

export function RecyclingSettingsView() {
  const { user, refetchUser } = useAuth();

  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [notificationPrefs, setNotificationPrefs] = React.useState<NotificationPrefs | null>(null);
  const [notificationError, setNotificationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    getMyProfile()
      .then(({ user: profile }) => {
        setNotificationPrefs({
          emailNotificationsEnabled: profile.emailNotificationsEnabled,
          smsNotificationsEnabled: profile.smsNotificationsEnabled,
          rewardsEmailNotificationsEnabled: profile.rewardsEmailNotificationsEnabled,
        });
      })
      .catch(() => setNotificationPrefs(null));
  }, [user]);

  async function handleToggleNotification(kind: keyof typeof notificationPreferenceKeys, checked: boolean) {
    if (!notificationPrefs) return;
    const previous = notificationPrefs;
    const key = notificationPreferenceKeys[kind];
    setNotificationError(null);
    setNotificationPrefs({ ...notificationPrefs, [key]: checked });
    try {
      await updateMyProfile({ [key]: checked } as UpdateProfileInput);
    } catch (err: any) {
      setNotificationPrefs(previous);
      setNotificationError(err.message || "Couldn't save that preference. Try again.");
    }
  }

  // Form states
  const profile = user?.recyclingCompanyProfile || {};
  const [companyName, setCompanyName] = React.useState(profile.companyName || "");
  const [tradeLicense, setTradeLicense] = React.useState(profile.tradeLicenseNumber || "");
  const [district, setDistrict] = React.useState(profile.district || "");
  
  // Array states
  const [serviceAreasStr, setServiceAreasStr] = React.useState(
    (profile.serviceAreas || []).join(", ")
  );
  const [acceptedMaterialsStr, setAcceptedMaterialsStr] = React.useState(
    (profile.acceptedWasteMaterials || []).join(", ")
  );

  // User model states
  const [fullName, setFullName] = React.useState(user?.fullName || "");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [address, setAddress] = React.useState(user?.formattedAddress || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      
      // Clean up phone number (remove spaces)
      const cleanPhone = phone ? phone.replace(/\s+/g, '') : null;

      // Update User fields (Contact Person, Phone, Address)
      await authFetch("/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: cleanPhone,
          formattedAddress: address,
        }),
      });

      // Update RecyclingProfile fields
      const serviceAreas = serviceAreasStr.split(",").map((s: string) => s.trim()).filter(Boolean);
      const acceptedWasteMaterials = acceptedMaterialsStr.split(",").map((s: string) => s.trim().toUpperCase().replace(/ /g, "_")).filter(Boolean);

      await authFetch("/users/me/recycling-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          tradeLicenseNumber: tradeLicense,
          district,
          serviceAreas,
          acceptedWasteMaterials,
        }),
      });

      await refetchUser();
      setSuccessMsg("Settings updated successfully!");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings.");
    } finally {
      setLoading(false);
    }
  };

  const verificationStatus = profile.verificationStatus || "PENDING";

  return (
    <div className="mt-6 max-w-4xl space-y-6">
      {/* Verification Status Card */}
      <div className={`p-4 rounded-xl border flex items-start gap-4 ${verificationStatus === "APPROVED" ? "bg-emerald-50 border-emerald-200" : verificationStatus === "REJECTED" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
        <Icon icon={verificationStatus === "APPROVED" ? CheckCircle2 : AlertCircle} className={verificationStatus === "APPROVED" ? "text-emerald-600" : verificationStatus === "REJECTED" ? "text-red-600" : "text-amber-600"} />
        <div>
          <h4 className={`font-semibold ${verificationStatus === "APPROVED" ? "text-emerald-900" : verificationStatus === "REJECTED" ? "text-red-900" : "text-amber-900"}`}>
            Verification Status: {verificationStatus}
          </h4>
          <p className="text-body-sm mt-1 opacity-80 text-current">
            {verificationStatus === "APPROVED" 
              ? "Your company is verified and active on the marketplace." 
              : verificationStatus === "REJECTED" 
              ? "Your verification was rejected. Please update your documents." 
              : "Your account is currently under review by our admin team."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 p-6 bg-neutral-50/50">
            <h3 className="text-h5 text-neutral-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-neutral-400" />
              Company Details
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Company Name</label>
              <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Trade License Number</label>
              <input type="text" value={tradeLicense} onChange={(e) => setTradeLicense(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Service Areas (Comma separated)</label>
              <input type="text" value={serviceAreasStr} onChange={(e) => setServiceAreasStr(e.target.value)} placeholder="e.g. Dhaka, Chittagong, Sylhet" className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Accepted Waste Materials (Comma separated)</label>
              <input type="text" value={acceptedMaterialsStr} onChange={(e) => setAcceptedMaterialsStr(e.target.value)} placeholder="e.g. PLASTIC, PAPER, ELECTRONIC" className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
              <p className="text-xs text-neutral-500 mt-1">Available categories: PLASTIC, PAPER, ORGANIC, GLASS, METAL, ELECTRONIC, OTHER</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden">
          <div className="border-b border-neutral-100 p-6 bg-neutral-50/50">
            <h3 className="text-h5 text-neutral-900 flex items-center gap-2">
              <Icon icon={MapPin} className="w-5 h-5 text-neutral-400" />
              Contact & Location
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Contact Person (Full Name)</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Email Address (Read-only)</label>
              <input type="email" disabled value={user?.email || ""} className="w-full rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 px-4 py-2.5 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Account Type (Read-only)</label>
              <input type="text" disabled value="♻️ Recycling Company" className="w-full rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-500 px-4 py-2.5 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">District / City</label>
              <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-body-sm font-medium text-neutral-700 mb-2">Full Address</label>
              <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading} size="lg" className="min-w-[150px]">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Changes"}
          </Button>
        </div>
      </form>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden">
        <div className="border-b border-neutral-100 p-6 bg-neutral-50/50">
          <h3 className="text-h5 text-neutral-900 flex items-center gap-2">
            <Icon icon={Bell} className="w-5 h-5 text-neutral-400" />
            Notification Preferences
          </h3>
        </div>
        <div className="p-6">
          {notificationError && <ErrorBanner className="mb-4">{notificationError}</ErrorBanner>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 text-body text-neutral-900 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 transition-colors">
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600 rounded shrink-0"
                checked={notificationPrefs?.emailNotificationsEnabled ?? false}
                disabled={!notificationPrefs}
                onChange={(e) => void handleToggleNotification("email", e.target.checked)}
              />
              Email me about collection updates
            </label>
            <label className="flex items-center gap-3 text-body text-neutral-900 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 transition-colors">
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600 rounded shrink-0"
                checked={notificationPrefs?.smsNotificationsEnabled ?? false}
                disabled={!notificationPrefs}
                onChange={(e) => void handleToggleNotification("sms", e.target.checked)}
              />
              Text me about collection updates
            </label>
            <label className="flex items-center gap-3 text-body text-neutral-900 cursor-pointer p-3 rounded-xl hover:bg-neutral-50 transition-colors">
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600 rounded shrink-0"
                checked={notificationPrefs?.rewardsEmailNotificationsEnabled ?? false}
                disabled={!notificationPrefs}
                onChange={(e) => void handleToggleNotification("rewardsEmail", e.target.checked)}
              />
              Email me about ratings &amp; performance updates
            </label>
          </div>
          {!notificationPrefs && (
            <p className="text-caption text-neutral-500 mt-4">Loading your saved preferences…</p>
          )}
        </div>
      </div>
    </div>
  );
}
