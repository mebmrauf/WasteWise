"use client";

// Client Component for the same reasons as ProfileView.tsx: holds local
// upload/result state and uses useRequireRole. Gated to USER-role accounts
// only, matching ProfileView's gate — this is a household/business feature,
// not a collector or admin one.
//
// Unlike ProfileView's avatar upload (which reuses the dedicated
// AvatarUpload component, tightly coupled to circular-preview avatar
// semantics), this uses a plain file input + Card layout, since there's no
// existing generic "upload any photo" component to reuse yet.
import * as React from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { Divider } from "@/components/Divider";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageContainer } from "@/components/PageContainer";
import { useRequireRole } from "@/lib/auth/AuthContext";
import { AuthApiError } from "@/lib/api/auth";
import { scanWastePhoto, getMyWasteScans, correctWasteScan, type WasteScan } from "@/lib/api/wasteRecognition";

// Never surface a raw AuthApiError.message for an unmapped code — same
// pattern as ProfileView's profileErrorMessages.
const scanErrorMessages: Record<string, string> = {
  UNSUPPORTED_FILE_TYPE: "Please upload a JPEG, PNG, or WEBP image.",
  FILE_TOO_LARGE: "Image must be smaller than 5MB.",
  FILE_REQUIRED: "Please choose a photo to upload.",
  NO_LABELS_DETECTED: "Couldn't identify anything in that photo. Try a clearer, closer shot.",
  VISION_NOT_CONFIGURED: "Waste recognition isn't available right now. Please try again later.",
  VISION_FAILED: "Couldn't analyze that photo right now. Please try again.",
};

function resolveScanErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    return scanErrorMessages[err.code] ?? fallback;
  }
  return fallback;
}

const CATEGORY_LABELS: Record<WasteScan["detectedCategory"], string> = {
  PLASTIC: "Plastic",
  PAPER: "Paper",
  METAL: "Metal",
  GLASS: "Glass",
  ELECTRONIC: "Electronic",
  ORGANIC: "Organic",
  MIXED: "Mixed",
  OTHER: "Other",
};

export function WasteRecognitionView() {
  const { user, isLoading } = useRequireRole(["USER"]);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<WasteScan | null>(null);

  const [history, setHistory] = React.useState<WasteScan[] | null>(null);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = React.useState(false);
  const [correctionSaving, setCorrectionSaving] = React.useState(false);
  const [correctionError, setCorrectionError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadHistory = React.useCallback(() => {
    setHistoryError(null);
    getMyWasteScans()
      .then(({ scans }) => setHistory(scans))
      .catch((err: unknown) => {
        setHistoryError(
          resolveScanErrorMessage(err, "Couldn't load your scan history. Try refreshing the page."),
        );
      });
  }, []);

  React.useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user, loadHistory]);

  // Revoke the object URL when it's replaced or the component unmounts, so
  // repeated scans don't leak blob URLs.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelected(file: File) {
    setScanError(null);
    setResult(null);
    setIsCorrecting(false);
    setCorrectionError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    void runScan(file);
  }

  

  async function runScan(file: File) {
    setIsScanning(true);
    setScanError(null);
    try {
      const { scan } = await scanWastePhoto(file);
      setResult(scan);
      setIsScanning(false);
      loadHistory(); // refresh history in the background — fire and forget
    } catch (err) {
      setIsScanning(false);
      setScanError(resolveScanErrorMessage(err, "Couldn't analyze that photo. Try again."));
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFileSelected(file);
    // Reset so selecting the same file again still fires onChange.
    event.target.value = "";
  }

  function handleTryAnother() {
    setResult(null);
    setScanError(null);
    setIsCorrecting(false);
    setCorrectionError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    fileInputRef.current?.click();
  }

  

  async function handleCorrectCategory(category: WasteScan["detectedCategory"]) {
    if (!result) return;
    setCorrectionSaving(true);
    setCorrectionError(null);
    try {
      const { scan } = await correctWasteScan(result.id, category);
      setResult(scan);
      setIsCorrecting(false);
      setCorrectionSaving(false);
      loadHistory();
    } catch {
      setCorrectionSaving(false);
      setCorrectionError("Couldn't save that correction. Try again.");
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
    // useRequireRole is already redirecting — render nothing rather than flash gated content.
    return null;
  }

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="flex items-center gap-4 animate-slide-up">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-inner">
          <Icon icon={Camera} size="xl" />
        </div>
        <div>
          <h1 className="font-heading text-h1 text-neutral-900">Waste Recognition</h1>
          <p className="mt-1 text-body-lg text-neutral-500">
            Not sure if something can be recycled? Snap a photo and we&apos;ll identify it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Left Column: Image Upload & Scanning */}
        <div className="lg:col-span-1">
          <Card className="glass-panel border-0 shadow-xl rounded-3xl animate-slide-up p-8 min-h-[400px] flex flex-col justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleInputChange}
            />

            {!previewUrl && (
              <div 
                className="w-full flex flex-col items-center justify-center gap-5 py-16 px-4 text-center border-2 border-dashed border-primary-200 rounded-[2rem] bg-primary-50/30 hover:bg-primary-50/60 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-600 mb-2 shadow-sm group-hover:scale-110 transition-transform">
                  <Icon icon={Camera} size="xl" aria-hidden />
                </div>
                <div>
                  <p className="font-heading text-h3 text-neutral-900">Scan an Item</p>
                  <p className="mt-2 text-body text-neutral-500 max-w-xs mx-auto">
                    Upload or snap a photo of any item to instantly check if it can be recycled.
                  </p>
                </div>
                <Button className="px-8 mt-2 bg-primary-600 hover:bg-primary-700 rounded-full shadow-md hover:shadow-lg transition-all" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  Choose a photo
                </Button>
              </div>
            )}

            {previewUrl && (
              <div className="w-full flex flex-col gap-6">
                <div className="relative overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-100/50 shadow-inner group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Selected waste item"
                    className="max-h-[500px] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {isScanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="absolute left-0 top-0 h-1.5 w-full bg-primary-500 shadow-[0_0_20px_rgba(16,185,129,1)] animate-[scan_2s_ease-in-out_infinite]" />
                      <div className="relative flex flex-col items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary-500/20 flex items-center justify-center animate-pulse">
                          <Icon icon={Camera} size="xl" className="text-primary-300" />
                        </div>
                        <p className="text-h4 font-heading text-white animate-pulse tracking-wide">Analyzing with AI…</p>
                      </div>
                    </div>
                  )}
                </div>

                {scanError && <ErrorBanner>{scanError}</ErrorBanner>}

                {!isScanning && (
                  <Button variant="secondary" className="rounded-full self-center border-neutral-300 hover:bg-neutral-100 px-8" onClick={handleTryAnother}>
                    <Icon icon={Camera} size="sm" className="mr-2" /> Try another photo
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Results & History */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {result && (
            <Card className="glass-panel border-0 shadow-xl rounded-3xl animate-slide-up p-8 bg-gradient-to-br from-white to-neutral-50" style={{ animationDelay: '100ms' }}>
              <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-caption font-semibold text-primary-600 uppercase tracking-wider mb-1">AI Analysis Complete</p>
                    <h2 className="font-heading text-h2 text-neutral-900">{CATEGORY_LABELS[result.detectedCategory]}</h2>
                  </div>
                  <div className={
                    result.isRecyclable 
                      ? "px-4 py-2 rounded-xl font-bold text-body-sm shadow-sm border bg-green-100 text-green-700 border-green-200 flex-shrink-0" 
                      : "px-4 py-2 rounded-xl font-bold text-body-sm shadow-sm border bg-red-100 text-red-700 border-red-200 flex-shrink-0"
                  }>
                    {result.isRecyclable ? "✓ Recyclable" : "✕ Not recyclable"}
                  </div>
                </div>

                {result.preparationTip && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
                    <p className="text-body-sm text-neutral-600 leading-relaxed">
                      <span className="font-semibold text-neutral-900">Pro Tip: </span>
                      {result.preparationTip}
                    </p>
                  </div>
                )}

                <Divider className="my-2" />

                {!isCorrecting ? (
                  <div className="flex items-center justify-between">
                    <span className="text-body-sm text-neutral-500">Does this result look incorrect?</span>
                    <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50" onClick={() => setIsCorrecting(true)}>
                      Suggest a fix
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                    <label className="text-body-sm font-medium text-neutral-900" htmlFor="category-correction">
                      Help us learn: what is it actually?
                    </label>
                    <select
                      id="category-correction"
                      className="rounded-xl border border-neutral-300 px-4 py-3 text-body-sm bg-white shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none"
                      disabled={correctionSaving}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          void handleCorrectCategory(e.target.value as WasteScan["detectedCategory"]);
                        }
                      }}
                    >
                      <option value="" disabled>
                        Choose the correct category…
                      </option>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    {correctionSaving && (
                      <span className="text-caption text-primary-600 animate-pulse">Saving your correction…</span>
                    )}
                    {correctionError && <ErrorBanner>{correctionError}</ErrorBanner>}
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-700" onClick={() => setIsCorrecting(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="glass-panel border-0 shadow-xl rounded-3xl animate-slide-up p-8 flex-1" style={{ animationDelay: result ? '200ms' : '100ms' }}>
            <h2 className="font-heading text-h3 text-neutral-900 mb-6">Recent Scans</h2>

            {historyError && <ErrorBanner className="mb-4">{historyError}</ErrorBanner>}

            {!history && !historyError && (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                 <div className="h-8 w-8 border-4 border-neutral-200 border-t-primary-500 rounded-full animate-spin mb-4" />
                 <p className="text-body-sm">Loading your scan history…</p>
              </div>
            )}

            {history && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                <Icon icon={Camera} size="lg" className="text-neutral-300 mb-3" />
                <p className="text-body-sm text-neutral-500 max-w-[200px]">
                  No scans yet. Upload your first photo to get started!
                </p>
              </div>
            )}

            {history && history.length > 0 && (
              <ul className="flex flex-col gap-3">
                {history.map((scan) => (
                  <li
                    key={scan.id}
                    className="flex items-center justify-between border border-neutral-100 bg-white/50 hover:bg-white p-4 rounded-2xl shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600 shadow-inner">
                         <Icon icon={Camera} size="sm" />
                      </div>
                      <span className="font-medium text-body text-neutral-900">
                        {CATEGORY_LABELS[scan.detectedCategory]}
                      </span>
                    </div>
                    <span className={scan.isRecyclable ? "text-caption font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full" : "text-caption font-bold text-neutral-600 bg-neutral-200 px-3 py-1.5 rounded-full"}>
                      {scan.isRecyclable ? "Recyclable" : "Not recyclable"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}