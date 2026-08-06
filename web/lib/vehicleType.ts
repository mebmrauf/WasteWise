export type VehicleType = "HANDCART" | "BICYCLE_VAN" | "MOTORCYCLE_VAN" | "PICKUP_TRUCK" | "TRUCK" | "OTHER";

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  HANDCART: "Handcart",
  BICYCLE_VAN: "Bicycle van",
  MOTORCYCLE_VAN: "Motorcycle van",
  PICKUP_TRUCK: "Pickup truck",
  TRUCK: "Truck",
  OTHER: "Other vehicle",
};
