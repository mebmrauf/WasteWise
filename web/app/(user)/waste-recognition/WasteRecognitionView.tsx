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
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
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
      <h1 className="text-h1 text-neutral-900">Waste recognition</h1>
      <p className="mt-2 text-body-lg text-neutral-500">
        Not sure if something can be recycled? Snap a photo and we&apos;ll identify it.
      </p>

      <Card className="mt-8 max-w-form">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {!previewUrl && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-body-sm text-neutral-500">
              Upload a photo of an item to check what it is and whether it can be recycled.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>Choose a photo</Button>
          </div>
        )}

        {previewUrl && (
          <div className="flex flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- local
                blob: preview URL, not a remote image next/image can optimize */}
            <img
              src={previewUrl}
              alt="Selected waste item"
              className="max-h-80 w-full rounded-lg border border-neutral-200 object-contain"
            />

            {isScanning && (
              <p className="text-body-sm text-neutral-500">Analyzing photo…</p>
            )}

            {scanError && <ErrorBanner>{scanError}</ErrorBanner>}

            {result && (
              <>
                <Divider label="Result" className="my-2" />
                <div className="flex flex-col gap-2">
                  <p className="text-body-lg text-neutral-900">
                    {CATEGORY_LABELS[result.detectedCategory]} —{" "}
                    {result.isRecyclable ? "Recyclable" : "Not recyclable"}
                  </p>
                  {result.preparationTip && (
                    <p className="text-body-sm text-neutral-500">{result.preparationTip}</p>
                  )}
                </div>

                {!isCorrecting ? (
                  <div className="flex items-center gap-3">
                    <span className="text-caption text-neutral-500">Was this correct?</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsCorrecting(true)}>
                      No, fix it
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="text-caption text-neutral-500" htmlFor="category-correction">
                      What is it actually?
                    </label>
                    <select
                      id="category-correction"
                      className="rounded-md border border-neutral-200 px-3 py-2 text-body-sm"
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
                      <span className="text-caption text-neutral-500">Saving…</span>
                    )}
                    {correctionError && <ErrorBanner>{correctionError}</ErrorBanner>}
                    <Button variant="ghost" size="sm" onClick={() => setIsCorrecting(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}

            {!isScanning && (
              <Button variant="ghost" onClick={handleTryAnother}>
                Try another photo
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="mt-8 max-w-form">
        <h2 className="text-h3 text-neutral-900">Recent scans</h2>

        {historyError && <ErrorBanner className="mt-4">{historyError}</ErrorBanner>}

        {!history && !historyError && (
          <p className="mt-4 text-body-sm text-neutral-500">Loading your scan history…</p>
        )}

        {history && history.length === 0 && (
          <p className="mt-4 text-body-sm text-neutral-500">
            No scans yet — try uploading a photo above.
          </p>
        )}

        {history && history.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {history.map((scan) => (
              <li
                key={scan.id}
                className="flex items-center justify-between border-b border-neutral-100 pb-3 last:border-0"
              >
                <span className="text-body-sm text-neutral-900">
                  {CATEGORY_LABELS[scan.detectedCategory]}
                </span>
                <span className="text-caption text-neutral-500">
                  {scan.isRecyclable ? "Recyclable" : "Not recyclable"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageContainer>
  );
}