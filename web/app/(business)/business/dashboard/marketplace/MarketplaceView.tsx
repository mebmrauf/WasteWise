"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ErrorBanner } from "@/components/ErrorBanner";
import { createBulkRequest, getMarketplaceRequests, getQuotations, acceptQuotation, rejectHighestQuotation, type BulkMarketplaceRequest, type MarketplaceQuotation } from "@/lib/api/marketplace";
import { Package, Clock, MapPin, Camera, Navigation, Search, Home, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { WasteCategorySelector, type WasteCategory } from "@/components/WasteCategorySelector";
import { WastePhotoUpload } from "@/components/WastePhotoUpload";
import { SummaryPanel, SummaryRow } from "@/components/SummaryPanel";
import { cn } from "@/lib/utils";
import { AddressAutocomplete, type AddressSuggestion } from "@/components/AddressAutocomplete";
import { fetchAddressSuggestions, fetchPlaceDetails, PlacesConfigError, fetchReverseGeocode, type PlaceDetails } from "@/lib/api/places";
import { getMyProfile, type UserProfile } from "@/lib/api/users";
import { AuthApiError } from "@/lib/api/auth";
import { DatePicker } from "@/components/DatePicker";

const ADDRESS_DEBOUNCE_MS = 300;
const ADDRESS_MIN_QUERY_LENGTH = 3;



function useBiddingStatus(request: BulkMarketplaceRequest) {
  const [isTimeUp, setIsTimeUp] = React.useState(false);

  React.useEffect(() => {
    if (request.status === "BIDDING_CLOSED") {
      setIsTimeUp(true);
      return;
    }
    const target = request.bidEndsAt 
      ? new Date(request.bidEndsAt).getTime() 
      : new Date(request.createdAt).getTime() + 24 * 60 * 60 * 1000;
      
    const check = () => setIsTimeUp(Date.now() >= target);
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [request]);

  const isClosed = request.status === "BIDDING_CLOSED" || isTimeUp;
  return { isClosed };
}

function BiddingCountdown({ request }: { request: BulkMarketplaceRequest }) {
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const { isClosed } = useBiddingStatus(request);

  React.useEffect(() => {
    if (isClosed) return;
    const target = request.bidEndsAt 
      ? new Date(request.bidEndsAt).getTime() 
      : new Date(request.createdAt).getTime() + 24 * 60 * 60 * 1000;
      
    const update = () => {
      const diff = target - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [request.bidEndsAt, request.createdAt, isClosed]);

  if (isClosed) return <span className="text-neutral-500 font-medium">Bidding Closed</span>;
  if (timeLeft <= 0) return null;
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return (
    <span className="text-primary-600 font-medium">
      Bidding closes in: {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export function MarketplaceView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<"create" | "list">("create");
  const [reviewingRequest, setReviewingRequest] = React.useState<BulkMarketplaceRequest | null>(null);
  
  const [requests, setRequests] = React.useState<BulkMarketplaceRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const [categories, setCategories] = React.useState<WasteCategory[]>([]);
  const [categoryWeights, setCategoryWeights] = React.useState<Record<string, string>>({});
  const [date, setDate] = React.useState("");

  const [additionalNotes, setAdditionalNotes] = React.useState("");
  const [images, setImages] = React.useState<string[]>([]);
  
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const [addressMode, setAddressMode] = React.useState<"saved" | "custom" | "current">("saved");
  const [addressModeTouched, setAddressModeTouched] = React.useState(false);
  const [customAddressQuery, setCustomAddressQuery] = React.useState("");
  const [customAddressSuggestions, setCustomAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = React.useState(false);
  const [addressSuggestionsError, setAddressSuggestionsError] = React.useState<string | null>(null);
  const [selectedCustomPlace, setSelectedCustomPlace] = React.useState<AddressSuggestion | null>(null);

  const [currentLocationPlace, setCurrentLocationPlace] = React.useState<PlaceDetails | null>(null);
  const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = React.useState(false);
  const [currentLocationError, setCurrentLocationError] = React.useState<string | null>(null);

  const addressSessionTokenRef = React.useRef<string | null>(null);
  const addressDebounceTimerRef = React.useRef<number | null>(null);
  const addressRequestSeqRef = React.useRef(0);

  const loadRequests = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getMarketplaceRequests();
      setRequests(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user?.accountType === "BUSINESS" && activeTab === "list") {
      void loadRequests();
    }
  }, [user, activeTab, loadRequests]);

  React.useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then(({ user }) => {
        if (cancelled) return;
        setProfile(user);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof AuthApiError
            ? "Couldn't load your saved address. You can still enter one below."
            : "Couldn't load your profile. You can still enter an address below.";
        setProfileError(message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!addressModeTouched && profile && !profile.placeId) {
      setAddressMode("custom");
    }
  }, [profile, addressModeTouched]);

  React.useEffect(() => {
    return () => {
      if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);
    };
  }, []);

  function ensureAddressSessionToken(): string {
    if (!addressSessionTokenRef.current) {
      addressSessionTokenRef.current = crypto.randomUUID();
    }
    return addressSessionTokenRef.current;
  }

  async function runAddressSuggestionsFetch(query: string) {
    const seq = ++addressRequestSeqRef.current;
    setIsLoadingAddressSuggestions(true);
    setAddressSuggestionsError(null);
    try {
      const token = ensureAddressSessionToken();
      const results = await fetchAddressSuggestions(query, token);
      if (seq !== addressRequestSeqRef.current) return;
      setCustomAddressSuggestions(results);
      setIsLoadingAddressSuggestions(false);
    } catch (err) {
      if (seq !== addressRequestSeqRef.current) return;
      setCustomAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(
        err instanceof PlacesConfigError
          ? "Address search isn't available right now."
          : "Couldn't load address suggestions. Try again.",
      );
    }
  }

  function handleAddressModeChange(id: string) {
    setAddressModeTouched(true);
    setAddressMode(id as "saved" | "custom" | "current");
  }

  const handleDetectLocation = React.useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setCurrentLocationError("Geolocation isn't supported by this browser.");
      return;
    }
    setIsLoadingCurrentLocation(true);
    setCurrentLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchReverseGeocode(position.coords.latitude, position.coords.longitude)
          .then((place) => {
            setCurrentLocationPlace(place);
            setIsLoadingCurrentLocation(false);
          })
          .catch((err: unknown) => {
            setCurrentLocationError(err instanceof Error ? err.message : "Couldn't detect your address.");
            setIsLoadingCurrentLocation(false);
          });
      },
      (err) => {
        setCurrentLocationError(`Couldn't get your location (${err.message}). Make sure permissions are granted.`);
        setIsLoadingCurrentLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  React.useEffect(() => {
    if (addressMode === "current" && !currentLocationPlace && !isLoadingCurrentLocation && !currentLocationError) {
      handleDetectLocation();
    }
  }, [addressMode, currentLocationPlace, isLoadingCurrentLocation, currentLocationError, handleDetectLocation]);

  function handleCustomAddressQueryChange(nextQuery: string) {
    setCustomAddressQuery(nextQuery);
    setSelectedCustomPlace(null); 

    if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);

    const trimmed = nextQuery.trim();
    if (trimmed.length < ADDRESS_MIN_QUERY_LENGTH) {
      addressRequestSeqRef.current += 1;
      setCustomAddressSuggestions([]);
      setIsLoadingAddressSuggestions(false);
      setAddressSuggestionsError(null);
      return;
    }

    addressDebounceTimerRef.current = window.setTimeout(() => {
      void runAddressSuggestionsFetch(trimmed);
    }, ADDRESS_DEBOUNCE_MS);
  }

  function handleSelectCustomAddress(suggestion: AddressSuggestion) {
    if (addressDebounceTimerRef.current !== null) window.clearTimeout(addressDebounceTimerRef.current);
    addressRequestSeqRef.current += 1;
    addressSessionTokenRef.current = null;
    setSelectedCustomPlace(suggestion);
    setCustomAddressQuery(suggestion.description);
    setCustomAddressSuggestions([]);
    setIsLoadingAddressSuggestions(false);
    setAddressSuggestionsError(null);
  }

  const pickupDateIso = date ? new Date(`${date}T12:00:00.000Z`).toISOString() : null;
  const isSlotInPast = pickupDateIso !== null && new Date(pickupDateIso) < new Date(new Date().setHours(0,0,0,0));

  const resolvedPlaceId = 
    addressMode === "saved" ? (profile?.placeId ?? null) 
    : addressMode === "current" ? (currentLocationPlace?.placeId ?? null) 
    : (selectedCustomPlace?.placeId ?? null);
  
  const resolvedAddressLabel =
    addressMode === "saved" ? (profile?.formattedAddress ?? null) 
    : addressMode === "current" ? (currentLocationPlace?.formattedAddress ?? null) 
    : (selectedCustomPlace?.description ?? null);

  const computedTotalWeight = React.useMemo(() => {
    let total = 0;
    for (const cat of categories) {
      const weight = parseFloat(categoryWeights[cat] || "0");
      if (!isNaN(weight)) total += weight;
    }
    return total;
  }, [categories, categoryWeights]);

  function handleCategoriesChange(nextCategories: WasteCategory[]) {
    setCategories(nextCategories);
    setCategoryWeights(prev => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (!nextCategories.includes(key as WasteCategory)) {
          delete next[key];
        }
      }
      return next;
    });
  }

  if (user?.accountType !== "BUSINESS") return null;

  const canSubmit = 
    categories.length > 0 && 
    computedTotalWeight >= 50 && 
    date !== "" &&
    !isSlotInPast && 
    resolvedPlaceId !== null && 
    !isSubmitting;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (categories.length === 0) {
      setErrorMsg("Please select at least one waste type.");
      return;
    }

    const hasInvalidWeights = categories.some(cat => parseFloat(categoryWeights[cat] || "0") <= 0);
    if (hasInvalidWeights) {
      setErrorMsg("Please enter a valid weight (greater than 0) for all selected materials.");
      return;
    }
    
    if (computedTotalWeight < 50) {
      setErrorMsg("Bulk marketplace requests require a minimum of 50 kg.");
      return;
    }

    if (!date) {
      setErrorMsg("Please select a pickup date.");
      return;
    }
    
    if (!resolvedPlaceId) {
      setErrorMsg("Please enter a pickup address.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalFormattedAddress: string | undefined;
      let finalLatitude: number | undefined;
      let finalLongitude: number | undefined;

      if (addressMode === "saved" && profile && profile.formattedAddress && profile.latitude !== null && profile.longitude !== null) {
        finalFormattedAddress = profile.formattedAddress;
        finalLatitude = profile.latitude;
        finalLongitude = profile.longitude;
      } else if (addressMode === "current" && currentLocationPlace) {
        finalFormattedAddress = currentLocationPlace.formattedAddress;
        finalLatitude = currentLocationPlace.latitude;
        finalLongitude = currentLocationPlace.longitude;
      } else if (addressMode === "custom" && selectedCustomPlace) {
        const details = await fetchPlaceDetails(selectedCustomPlace.placeId);
        finalFormattedAddress = details.formattedAddress;
        finalLatitude = details.latitude;
        finalLongitude = details.longitude;
      }

      await createBulkRequest({
        wasteTypes: categories.map(cat => ({
          category: cat,
          weightKg: parseFloat(categoryWeights[cat] || "0")
        })),
        estimatedWeightKg: computedTotalWeight,
        pickupAddress: finalFormattedAddress || resolvedAddressLabel || "",
        latitude: finalLatitude ?? undefined,
        longitude: finalLongitude ?? undefined,
        placeId: resolvedPlaceId || undefined,
        preferredPickupDate: new Date(`${date}T12:00:00.000Z`).toISOString(),
        additionalNotes: additionalNotes || undefined,
        images,
      });
      setSuccessMsg("Your bulk request was successfully posted to the marketplace!");
      setCategories([]);
      setCategoryWeights({});
      setDate("");

      setCustomAddressQuery("");
      setSelectedCustomPlace(null);
      setAdditionalNotes("");
      setImages([]);
      
      await loadRequests();
      setActiveTab("list");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageContainer className="py-8 lg:py-12">
      <div className="flex flex-col gap-8">
        
        {/* Top Navigation Tabs */}
        <div className="flex gap-4 border-b border-neutral-200">
          <button 
            onClick={() => {
              setActiveTab("create");
              setSuccessMsg(null);
            }}
            className={`pb-2 px-2 text-body font-medium transition-colors border-b-2 ${activeTab === "create" ? "border-primary-500 text-primary-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
          >
            Create Bulk Pickup
          </button>
          <button 
            onClick={() => {
              setActiveTab("list");
              setSuccessMsg(null);
            }}
            className={`pb-2 px-2 text-body font-medium transition-colors border-b-2 ${activeTab === "list" ? "border-primary-500 text-primary-600" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
          >
            Marketplace
          </button>
        </div>

        {successMsg && (
          <div className="rounded-md border border-green-500 bg-green-50 p-4 text-green-700">
            {successMsg}
          </div>
        )}

        {profileError && <ErrorBanner className="max-w-form">{profileError}</ErrorBanner>}

        {activeTab === "list" ? (
          <div className="space-y-4">
            {isLoading ? (
              <p className="text-neutral-500">Loading requests...</p>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-0 p-8 text-center">
                <Package className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-h4 text-neutral-900">No active requests</h3>
                <p className="mt-2 text-body text-neutral-500 mb-6">
                  You haven't posted any bulk requests yet.
                </p>
                <Button onClick={() => setActiveTab("create")}>Post your first request</Button>
              </div>
            ) : (
              requests.map(req => (
                <div key={req.id} className="rounded-xl border border-neutral-200 bg-neutral-0 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {req.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-body-sm text-neutral-500">
                        {format(new Date(req.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <h3 className="text-h5 text-neutral-900 mb-1">
                      {Array.isArray(req.wasteTypes) 
                        ? req.wasteTypes.map((w: any) => typeof w === "string" ? w : w.category).join(", ") 
                        : "Unknown"}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-body-sm text-neutral-500">
                      <div className="flex items-center gap-1"><MapPin size={16} /> {req.pickupAddress}</div>
                      <div className="flex items-center gap-1"><Package size={16} /> {req.estimatedWeightKg} kg</div>
                      <div className="flex items-center gap-1"><Clock size={16} /> {format(new Date(req.preferredPickupDate), "MMM d, yyyy")}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-center bg-neutral-50 rounded-lg p-2 min-w-[100px]">
                      <p className="text-display text-primary-600 leading-none">{req._count?.quotations || 0}</p>
                      <p className="text-caption text-neutral-500">Quotations</p>
                    </div>
                    {req.status === "OPEN_FOR_BIDDING" ? (
                      <div className="flex flex-col items-end gap-1">
                        <BiddingCountdown request={req} />
                        {req._count?.quotations ? (
                          <Button variant="secondary" size="sm" onClick={() => setReviewingRequest(req)}>View Bids</Button>
                        ) : null}
                      </div>
                    ) : req.status === "BIDDING_CLOSED" && req._count?.quotations ? (
                      <Button variant="primary" size="sm" onClick={() => setReviewingRequest(req)}>Review Bids</Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="animate-slide-up">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-100 p-8 mb-8 rounded-2xl shadow-sm">
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Post a bulk request</h1>
              <p className="mt-2 text-neutral-600">
                Post your large-scale recycling needs to the marketplace and receive competitive quotations from verified recycling companies.
              </p>
            </Card>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-6">
                
                {/* Section 1: Categories */}
                <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                      <Icon icon={Package} size="lg" />
                    </div>
                    <div>
                      <h2 className="font-heading text-h3 text-neutral-900">What are you recycling?</h2>
                      <p className="mt-1 text-body-sm text-neutral-500">Select every category that applies to this bulk request.</p>
                    </div>
                  </div>
                  <WasteCategorySelector
                    value={categories}
                    onChange={handleCategoriesChange}
                    aria-label="What are you selling?"
                    className="mt-5"
                  />
                </Card>

                {/* Section 2: Quantity & Time */}
                <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                      <Icon icon={Clock} size="lg" />
                    </div>
                    <div>
                      <h2 className="font-heading text-h3 text-neutral-900">Quantity & time</h2>
                      <p className="mt-1 text-body-sm text-neutral-500">Estimate how much you have of each category, and pick a pickup window.</p>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-col gap-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-end mb-2">
                        <p className="text-body font-semibold text-neutral-900">Estimated Weight</p>
                        {computedTotalWeight > 0 && (
                          <span className="text-body-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                            Total: {computedTotalWeight} kg
                          </span>
                        )}
                      </div>

                      {categories.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                          <p className="text-body-sm text-neutral-500">Select materials above to enter their weights.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
                          {categories.map((cat) => (
                            <div key={cat} className="flex items-center justify-between gap-4">
                              <label className="text-body-sm font-medium text-neutral-700 capitalize">
                                {cat.toLowerCase()} Weight (kg)
                              </label>
                              <Input
                                type="number"
                                min="0.1"
                                step="0.1"
                                placeholder="e.g. 50"
                                value={categoryWeights[cat] || ""}
                                onChange={(e) => setCategoryWeights(prev => ({ ...prev, [cat]: e.target.value }))}
                                className="bg-white w-32"
                                disabled={isSubmitting}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-body-sm text-neutral-500 mt-1">For bulk marketplace requests, a minimum of 50 kg is required.</p>
                    </div>

                    <div className="h-px w-full bg-neutral-100" />

                    <div className="flex flex-col gap-3">
                      <p className="text-body font-semibold text-neutral-900">When should we come?</p>
                        <DatePicker
                          label="Pickup date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                          disabled={isSubmitting}
                        />
                    </div>
                  </div>
                </Card>

                {/* Section 3: Photos & details */}
                <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                      <Icon icon={Camera} size="lg" />
                    </div>
                    <div>
                      <h2 className="font-heading text-h3 text-neutral-900">Photos & details (optional)</h2>
                      <p className="mt-1 text-body-sm text-neutral-500">Add photos and a short description of the item(s).</p>
                    </div>
                  </div>
                  <WastePhotoUpload value={images} onChange={setImages} disabled={isSubmitting} />
                  <div className="mt-6">
                    <label className="text-label text-neutral-800 mb-2 block">Description</label>
                    <textarea
                      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-body text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                      rows={3}
                      placeholder="e.g. mixed plastic containers and packaging from an office cleanout..."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      disabled={isSubmitting}
                      maxLength={1000}
                    />
                  </div>
                  <p className="mt-4 text-body-sm text-neutral-500">
                    We will use your uploaded photos and description to analyze the waste more accurately.
                  </p>
                </Card>
              </div>

              {/* Right Column: Address, Notes, and Summary */}
              <div className="flex flex-col gap-6 sticky top-24 h-fit">
                
                {/* Section 4: Address */}
                <Card className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-inner">
                      <Icon icon={MapPin} size="md" />
                    </div>
                    <div>
                      <h2 className="font-heading text-h3 text-neutral-900 leading-tight">Pickup address</h2>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Option: Saved Address */}
                    <button
                      type="button"
                      disabled={Boolean(profile) && !profile?.placeId}
                      onClick={() => handleAddressModeChange("saved")}
                      className={cn(
                        "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                        "focus-visible:outline-none focus-visible:shadow-focus",
                        Boolean(profile) && !profile?.placeId
                          ? "opacity-50 cursor-not-allowed border-neutral-100 bg-neutral-50"
                          : addressMode === "saved"
                          ? "border-primary-500 bg-primary-50/50 shadow-sm"
                          : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/20"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        addressMode === "saved" ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"
                      )}>
                        <Icon icon={Home} size="sm" />
                      </div>
                      <div>
                        <p className={cn("text-body font-semibold", addressMode === "saved" ? "text-primary-900" : "text-neutral-900")}>
                          Saved Address
                        </p>
                        <p className="text-label text-neutral-500">
                          Use the address from your profile
                        </p>
                      </div>
                    </button>

                    {/* Option: Current Location */}
                    <button
                      type="button"
                      onClick={() => handleAddressModeChange("current")}
                      className={cn(
                        "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                        "focus-visible:outline-none focus-visible:shadow-focus",
                        addressMode === "current"
                          ? "border-primary-500 bg-primary-50/50 shadow-sm"
                          : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/20"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        addressMode === "current" ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"
                      )}>
                        <Icon icon={Navigation} size="sm" />
                      </div>
                      <div>
                        <p className={cn("text-body font-semibold", addressMode === "current" ? "text-primary-900" : "text-neutral-900")}>
                          Current Location
                        </p>
                        <p className="text-label text-neutral-500">
                          Use your device's GPS
                        </p>
                      </div>
                    </button>

                    {/* Option: Custom Address */}
                    <button
                      type="button"
                      onClick={() => handleAddressModeChange("custom")}
                      className={cn(
                        "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                        "focus-visible:outline-none focus-visible:shadow-focus",
                        addressMode === "custom"
                          ? "border-primary-500 bg-primary-50/50 shadow-sm"
                          : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/20"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        addressMode === "custom" ? "bg-primary-100 text-primary-600" : "bg-neutral-100 text-neutral-500"
                      )}>
                        <Icon icon={Search} size="sm" />
                      </div>
                      <div>
                        <p className={cn("text-body font-semibold", addressMode === "custom" ? "text-primary-900" : "text-neutral-900")}>
                          Different Address
                        </p>
                        <p className="text-label text-neutral-500">
                          Search for a new location
                        </p>
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-neutral-100">
                    {addressMode === "saved" ? (
                      !profile ? (
                        <p className="text-body-sm text-neutral-500">Loading your saved address…</p>
                      ) : profile.placeId ? (
                        <p className="text-body-sm text-neutral-900">{profile.formattedAddress}</p>
                      ) : (
                        <p className="text-body-sm text-neutral-500">
                          You don't have a saved address yet. Add one from your profile, or enter a different one below.
                        </p>
                      )
                    ) : addressMode === "current" ? (
                      <div className="flex flex-col gap-3">
                        {currentLocationError && <ErrorBanner>{currentLocationError}</ErrorBanner>}
                        {!currentLocationPlace ? (
                          <div className="flex flex-col items-start gap-2">
                            <p className="text-body-sm text-neutral-500">We'll use your device's GPS to find your address.</p>
                            {isLoadingCurrentLocation && (
                              <p className="text-body-sm text-neutral-500">Detecting location…</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-2">
                            <p className="text-body-sm text-neutral-900">{currentLocationPlace.formattedAddress}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <AddressAutocomplete
                        label="Address"
                        placeholder="Start typing your address…"
                        value={customAddressQuery}
                        onChange={handleCustomAddressQueryChange}
                        suggestions={customAddressSuggestions}
                        onSelectSuggestion={handleSelectCustomAddress}
                        isLoading={isLoadingAddressSuggestions}
                        error={addressSuggestionsError}
                      />
                    )}
                  </div>
                </Card>

                {/* Summary Panel */}
                <SummaryPanel
                  title="Request summary"
                  className="p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-neutral-100 transition-all"
                  footer={
                    <div className="flex flex-col gap-3">
                      {errorMsg && <ErrorBanner>{errorMsg}</ErrorBanner>}
                      <Button fullWidth disabled={!canSubmit} onClick={() => void handleSubmit()} className="rounded-full h-12 shadow-md hover:shadow-lg transition-all text-body font-bold bg-primary-600 hover:bg-primary-700">
                        {isSubmitting ? "Posting request…" : "Post to Marketplace"}
                      </Button>
                    </div>
                  }
                >
                  <div>
                    <p className="text-body-sm text-neutral-500">Categories & estimated weight</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {categories.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                              <span key={category} className="px-3 py-1 bg-neutral-100 rounded-full text-body-sm font-medium text-neutral-700">
                                {category}
                              </span>
                            ))}
                          </div>
                          {computedTotalWeight > 0 && (
                            <p className="text-body-sm font-semibold text-neutral-900 mt-2">
                              Total Weight: {computedTotalWeight} kg
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-body-sm text-neutral-500">Not selected yet</span>
                      )}
                    </div>
                  </div>
                  <SummaryRow
                    label="Window"
                    value={date ? new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : "Not selected yet"}
                  />
                  <SummaryRow 
                    label="Address" 
                    value={resolvedAddressLabel ? resolvedAddressLabel : "Not selected yet"} 
                  />
                </SummaryPanel>

              </div>
            </div>
          </div>
        )}
      </div>

      {reviewingRequest && (
        <ReviewBidsModal 
          request={reviewingRequest} 
          onClose={() => setReviewingRequest(null)}
          onAccept={() => {
            void loadRequests();
          }}
        />
      )}
    </PageContainer>
  );
}

function ReviewBidsModal({ request, onClose, onAccept }: { request: BulkMarketplaceRequest; onClose: () => void; onAccept: () => void }) {
  const [quotations, setQuotations] = React.useState<MarketplaceQuotation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processingState, setProcessingState] = React.useState<{ id: string; action: 'accept' | 'reject' } | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { isClosed } = useBiddingStatus(request);

  const highestQuoteId = React.useMemo(() => {
    if (!quotations || quotations.length === 0) return null;
    const serverHighest = quotations.find(q => q.isHighestBid);
    if (serverHighest) return serverHighest.id;
    const sorted = [...quotations].sort((a, b) => {
      if (a.purchasePrice !== b.purchasePrice) return b.purchasePrice - a.purchasePrice;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return sorted[0].id;
  }, [quotations]);

  React.useEffect(() => {
    async function load() {
      try {
        const data = await getQuotations(request.id);
        setQuotations(data);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load quotations");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [request.id]);

  const handleAccept = async (quoteId: string) => {
    try {
      setProcessingState({ id: quoteId, action: 'accept' });
      setErrorMsg(null);
      await acceptQuotation(request.id, quoteId);
      onAccept();
      
      const data = await getQuotations(request.id);
      setQuotations(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to accept quotation");
    } finally {
      setProcessingState(null);
    }
  };

  const handleReject = async (quoteId: string) => {
    try {
      setProcessingState({ id: quoteId, action: 'reject' });
      setErrorMsg(null);
      await rejectHighestQuotation(request.id, quoteId);
      onAccept();
      
      const data = await getQuotations(request.id);
      setQuotations(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reject quotation");
    } finally {
      setProcessingState(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-neutral-200 flex flex-col">
        <div className="sticky top-0 bg-white border-b border-neutral-100 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <h2 className="text-h4 text-neutral-900">Review Bids</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 text-neutral-500 hover:bg-neutral-100 transition-colors">
            <Icon icon={X} size="sm" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {!isClosed ? (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Bidding is still open</h3>
                <p className="text-sm text-blue-700">You can accept an offer once the bidding period expires.</p>
              </div>
              <BiddingCountdown request={request} />
            </div>
          ) : quotations.length > 0 ? (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-emerald-900">Bidding has closed</h3>
                <p className="text-sm text-emerald-700">The highest quotation has been selected automatically. Please review it and decide whether to accept or reject the offer.</p>
              </div>
              <span className="text-emerald-700 font-medium whitespace-nowrap ml-4">Bidding Closed</span>
            </div>
          ) : null}

          {errorMsg && <ErrorBanner className="mb-4">{errorMsg}</ErrorBanner>}
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : quotations.length === 0 ? (
            <p className="text-center text-neutral-500 py-8">No bids found for this request.</p>
          ) : (
            <div className="space-y-4">
              {quotations.map(quote => {
                const isHighest = quote.id === highestQuoteId;
                const canDecide = isClosed && isHighest && quote.status === "PENDING";

                return (
                  <div key={quote.id} className={cn(
                    "border rounded-xl p-5 transition-colors",
                    isClosed && isHighest ? "border-emerald-500 bg-emerald-50/30" : "border-neutral-200"
                  )}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {quote.company?.avatarUrl ? (
                          <img src={quote.company.avatarUrl} alt={quote.company.fullName} className="w-10 h-10 rounded-full object-cover bg-neutral-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                            {quote.company?.fullName?.charAt(0) || "C"}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-neutral-900">{quote.company?.fullName}</h4>
                          <p className="text-xs text-neutral-500">Status: {quote.status}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        {isClosed && isHighest && (
                          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md mb-1">
                            Highest Bid
                          </span>
                        )}
                        <p className="text-xl font-bold text-emerald-600">BDT {quote.purchasePrice}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm bg-neutral-50 p-4 rounded-lg">
                      <div>
                        <span className="block text-neutral-500 text-xs mb-1">Proposed Pickup</span>
                        <span className="font-medium text-neutral-900">
                          {new Date(quote.estimatedPickupDate).toLocaleDateString()} {quote.estimatedPickupTime && `at ${quote.estimatedPickupTime}`}
                        </span>
                      </div>
                      <div>
                        <span className="block text-neutral-500 text-xs mb-1">Vehicle Type</span>
                        <span className="font-medium text-neutral-900 capitalize">{quote.vehicleType.replace(/_/g, ' ').toLowerCase()}</span>
                      </div>
                      {quote.additionalNotes && (
                        <div className="col-span-2">
                          <span className="block text-neutral-500 text-xs mb-1">Additional Notes</span>
                          <span className="text-neutral-700">{quote.additionalNotes}</span>
                        </div>
                      )}
                    </div>

                    {canDecide && (
                      <div className="mt-6 border-t border-emerald-100 pt-4 flex flex-col items-center">
                        <p className="text-body font-medium text-neutral-900 mb-4 text-center">
                          The highest quotation has been selected automatically. Do you want to accept this offer?
                        </p>
                        <div className="flex gap-4">
                          <Button 
                            variant="secondary"
                            onClick={() => { if (!processingState) handleReject(quote.id); }} 
                            disabled={processingState?.id === quote.id && processingState.action === 'reject'}
                            className={processingState !== null && !(processingState.id === quote.id && processingState.action === 'reject') ? "pointer-events-none" : ""}
                          >
                            {processingState?.id === quote.id && processingState.action === 'reject' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Reject
                          </Button>
                          <Button 
                            onClick={() => { if (!processingState) handleAccept(quote.id); }} 
                            disabled={processingState?.id === quote.id && processingState.action === 'accept'}
                            className={processingState !== null && !(processingState.id === quote.id && processingState.action === 'accept') ? "pointer-events-none" : ""}
                          >
                            {processingState?.id === quote.id && processingState.action === 'accept' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Accept
                          </Button>
                        </div>
                      </div>
                    )}

                    {quote.status === "ACCEPTED" && (
                      <div className="mt-4 flex justify-end">
                        <Button disabled className="bg-emerald-100 text-emerald-800 border-emerald-200 opacity-100">
                          Accepted
                        </Button>
                      </div>
                    )}
                    {quote.status === "REJECTED" && (
                      <div className="mt-4 flex justify-end">
                        <Button disabled className="bg-neutral-100 text-neutral-500 border-neutral-200 opacity-100">
                          Rejected
                        </Button>
                      </div>
                    )}
                    {quote.status === "PENDING" && !canDecide && request.status !== "OPEN_FOR_BIDDING" && (
                      <div className="mt-4 flex justify-end">
                        <span className="text-sm font-medium text-neutral-400">Not Selected</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
