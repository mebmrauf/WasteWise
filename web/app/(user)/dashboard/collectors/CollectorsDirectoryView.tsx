"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { BadgeCheck, MapPin, Phone, Star, Truck, User } from "lucide-react";
import { VEHICLE_TYPE_LABELS, type VehicleType } from "@/lib/vehicleType";
import { getVerifiedCollectors, type CollectorDirectoryEntry, type CollectorSort } from "@/lib/api/collectors";
import { getMyProfile, resolveAvatarUrl } from "@/lib/api/users";
import { FilterPillSelect } from "@/components/FilterPillSelect";
import { LocationPickerPill, type ResolvedLocation, type SavedAddress } from "@/components/LocationPickerPill";
import Image from "next/image";
import Link from "next/link";

const RATING_OPTIONS = [
  { value: "", label: "Any" },
  { value: "3", label: "3+ Stars" },
  { value: "4", label: "4+ Stars" },
  { value: "4.5", label: "4.5+ Stars" },
];

const SORT_OPTIONS: { value: CollectorSort; label: string }[] = [
  { value: "nearest", label: "Nearest" },
  { value: "rating", label: "Top rated" },
];


export function CollectorsDirectoryView() {
  const [savedAddress, setSavedAddress] = React.useState<SavedAddress | null>(null);
  const [location, setLocation] = React.useState<ResolvedLocation | null>(null);
  const [radiusKm, setRadiusKm] = React.useState<number | undefined>();
  const [sliderRadiusKm, setSliderRadiusKm] = React.useState<number>(20);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);

  const [vehicleType, setVehicleType] = React.useState<VehicleType | "ALL">("ALL");
  const [minRating, setMinRating] = React.useState<string>("");
  const [sort, setSort] = React.useState<CollectorSort>("nearest");

  const [collectors, setCollectors] = React.useState<CollectorDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (sliderRadiusKm !== radiusKm) {
        setRadiusKm(sliderRadiusKm);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sliderRadiusKm, radiusKm]);

  React.useEffect(() => {
    let active = true;
    getMyProfile()
      .then(({ user }) => {
        if (!active) return;
        if (user.formattedAddress && user.latitude !== null && user.longitude !== null) {
          const address: SavedAddress = {
            formattedAddress: user.formattedAddress,
            latitude: user.latitude,
            longitude: user.longitude,
          };
          setSavedAddress(address);
          setLocation({ label: address.formattedAddress, latitude: address.latitude, longitude: address.longitude });
        }
        const initialRadius = user.collectorFindRadiusKm ?? 20;
        setRadiusKm(initialRadius);
        setSliderRadiusKm(initialRadius);
        setIsLoadingProfile(false);
      })
      .catch((err) => {
        console.error(err);
        if (active) setIsLoadingProfile(false);
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!location) {
      setCollectors([]);
      return;
    }

    let active = true;
    setIsLoading(true);

    getVerifiedCollectors({
      lat: location.latitude,
      lng: location.longitude,
      vehicleType: vehicleType !== "ALL" ? vehicleType : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      radiusKm,
      sort,
    })
      .then((data) => {
        if (active) {
          setCollectors(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [location, vehicleType, minRating, radiusKm, sort]);

  const vehicleOptions = [
    { value: "ALL", label: "All Vehicles" },
    ...Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => ({
      value: val,
      label,
    })),
  ];

  return (
    <PageContainer className="py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-display text-neutral-900 mb-2 font-bold tracking-tight">Find a Collector</h1>
        <p className="text-body-lg text-neutral-600">
          Browse verified independent collectors operating within {radiusKm ?? 20} km of your location.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm mb-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <LocationPickerPill savedAddress={savedAddress} value={location} onChange={setLocation} className="w-full sm:w-[280px] shrink-0" />
          <div className="flex flex-wrap gap-2">
            <FilterPillSelect
              label="Vehicle"
              value={vehicleType}
              onChange={(v) => setVehicleType(v as VehicleType | "ALL")}
              active={vehicleType !== "ALL"}
              options={vehicleOptions}
            />
            <FilterPillSelect
              label="Sort"
              value={sort}
              onChange={(v) => setSort(v as CollectorSort)}
              active
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <label htmlFor="directory-radius" className="text-label text-neutral-800 whitespace-nowrap">
              Search radius
            </label>
            <input
              id="directory-radius"
              type="range"
              min={5}
              max={50}
              step={1}
              value={sliderRadiusKm}
              onChange={(event) => setSliderRadiusKm(Number(event.target.value))}
              className="flex-1 accent-primary-600"
            />
            <span className="w-16 text-right text-body-sm font-medium text-neutral-800">
              {sliderRadiusKm} km
            </span>
          </div>

          <div className="sm:ml-auto text-body-sm text-neutral-600">
            {!location ? null : isLoading ? (
              "Finding collectors..."
            ) : (
              <span className="font-medium text-primary-700">
                {collectors.length} {collectors.length === 1 ? "collector" : "collectors"} match this radius
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoadingProfile ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-neutral-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : !location ? (
        <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex justify-center mb-4 text-green-600">
            <Icon icon={BadgeCheck} size="xl" />
          </div>
          <h3 className="text-h4 text-neutral-900 font-medium mb-2">Find Local Collectors</h3>
          <p className="text-neutral-500 max-w-sm mx-auto">Set your location above to find verified independent collectors operating near you.</p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-neutral-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : collectors.length === 0 ? (
        <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100">
          <div className="flex justify-center mb-4 text-neutral-400">
            <Icon icon={User} size="xl" />
          </div>
          <h3 className="text-h4 text-neutral-900 font-medium mb-2">No collectors found</h3>
          <p className="text-neutral-500">No verified collectors within {radiusKm ?? 20} km yet — try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collectors.map((collector) => (
            <Card key={collector.id} className="flex flex-col p-6 shadow-sm hover:border-green-300 transition-colors bg-white">
              <div className="flex items-start gap-4 mb-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-neutral-200 shrink-0">
                  {collector.avatarUrl ? (
                    <Image
                      src={resolveAvatarUrl(collector.avatarUrl) as string}
                      alt={collector.fullName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400">
                      <Icon icon={User} size="lg" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-neutral-900 leading-tight line-clamp-1">{collector.fullName}</h3>
                    <Icon icon={BadgeCheck} className="text-green-500 shrink-0" size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-caption text-neutral-600">
                    <span className="flex items-center gap-1">
                      <Icon icon={Star} size="sm" className="text-yellow-500" />
                      <span className="font-medium text-neutral-900">{collector.averageRating?.toFixed(1) || "New"}</span>
                      {collector.totalRatings > 0 && <span>({collector.totalRatings})</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center gap-2 text-body-sm text-neutral-700 bg-neutral-50 p-2 rounded-lg">
                  <Icon icon={Truck} size="sm" className="text-neutral-400" />
                  {VEHICLE_TYPE_LABELS[collector.vehicleType]}
                </div>
                {collector.phone && (
                  <a
                    href={`tel:${collector.phone}`}
                    className="flex items-center gap-2 text-body-sm text-neutral-700 bg-neutral-50 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    <Icon icon={Phone} size="sm" className="text-neutral-400" />
                    {collector.phone}
                  </a>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-caption font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md line-clamp-1">
                  <Icon icon={MapPin} size="sm" className="shrink-0" />
                  {collector.distanceKm !== null ? `${collector.distanceKm.toFixed(1)} km away` : "Location not set"}
                </span>
                <Link href={`/dashboard/pickups/new?preferredCollectorId=${collector.id}&collectorName=${encodeURIComponent(collector.fullName)}`}>
                  <Button variant="secondary" size="sm" className="text-green-800">
                    Request
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
