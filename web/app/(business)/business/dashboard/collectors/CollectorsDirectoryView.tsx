"use client";

import * as React from "react";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { Icon } from "@/components/Icon";
import { BadgeCheck, Star, Truck, User } from "lucide-react";
import { ALL_SERVICE_AREAS } from "@/lib/areas";
import { VEHICLE_TYPE_LABELS, type VehicleType } from "@/lib/vehicleType";
import { getVerifiedCollectors, type CollectorDirectoryEntry } from "@/lib/api/collectors";
import { resolveAvatarUrl } from "@/lib/api/users";
import Image from "next/image";
import Link from "next/link";

export function CollectorsDirectoryView() {
  const [serviceArea, setServiceArea] = React.useState<string>("");
  const [vehicleType, setVehicleType] = React.useState<VehicleType | "ALL">("ALL");
  const [collectors, setCollectors] = React.useState<CollectorDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const savedArea = localStorage.getItem("wasteWise_preferredServiceArea");
    if (savedArea && ALL_SERVICE_AREAS.includes(savedArea)) {
      setServiceArea(savedArea);
    }
  }, []);

  function handleServiceAreaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newArea = e.target.value;
    setServiceArea(newArea);
    if (newArea) {
      localStorage.setItem("wasteWise_preferredServiceArea", newArea);
    } else {
      localStorage.removeItem("wasteWise_preferredServiceArea");
    }
  }

  React.useEffect(() => {
    if (!serviceArea) {
      setCollectors([]);
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    
    getVerifiedCollectors({
      serviceArea: serviceArea || undefined,
      vehicleType: vehicleType !== "ALL" ? vehicleType : undefined,
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
  }, [serviceArea, vehicleType]);

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
        <h1 className="text-display text-neutral-900 mb-2 font-bold tracking-tight">Verified Collectors</h1>
        <p className="text-body-lg text-neutral-600 max-w-2xl">
          Browse our trusted network of verified independent collectors operating in your area.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm mb-8 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select
            label="Service Area"
            value={serviceArea}
            onChange={handleServiceAreaChange}
            options={[
              { value: "", label: "Select an area..." },
              ...ALL_SERVICE_AREAS.map((area) => ({ value: area, label: area }))
            ]}
          />
        </div>
        <div className="flex-1">
          <Select
            label="Vehicle Type"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType | "ALL")}
            options={vehicleOptions}
          />
        </div>
      </div>

      {/* Results */}
      {!serviceArea ? (
        <div className="text-center py-20 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex justify-center mb-4 text-green-600">
            <Icon icon={BadgeCheck} size="xl" />
          </div>
          <h3 className="text-h4 text-neutral-900 font-medium mb-2">Find Local Collectors</h3>
          <p className="text-neutral-500 max-w-sm mx-auto">Select your service area above to find verified independent collectors operating near you.</p>
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
          <p className="text-neutral-500">Try adjusting your filters or checking a different area.</p>
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
              </div>

              <div className="mt-auto pt-4 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-caption font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                  {collector.serviceArea || "All areas"}
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
