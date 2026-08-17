import { distanceKm, type LatLng } from "./geoDistance";

export interface RouteStopCandidate {
  pickupRequestId: string;
  lat: number;
  lng: number;
  pickupDate: Date;
}

export interface OptimizedStop {
  pickupRequestId: string;
  sequence: number;
  distanceFromPrevKm: number;
}

// Urgency bonus removed: routes are fully geographically optimized.
function pathDistanceKm(origin: LatLng, order: RouteStopCandidate[]): number {
  let total = 0;
  let prev: LatLng = origin;
  for (const stop of order) {
    total += distanceKm(prev, stop);
    prev = stop;
  }
  return total;
}

function reverseSegment(order: RouteStopCandidate[], from: number, to: number): void {
  let left = from;
  let right = to;
  while (left < right) {
    [order[left], order[right]] = [order[right], order[left]];
    left += 1;
    right -= 1;
  }
}

function improveWithTwoOpt(origin: LatLng, order: RouteStopCandidate[]): void {
  if (order.length < 3) return;

  let improved = true;
  let passes = 0;
  while (improved && passes < MAX_TWO_OPT_PASSES) {
    improved = false;
    passes += 1;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const before = pathDistanceKm(origin, order);
        reverseSegment(order, i, j);
        const after = pathDistanceKm(origin, order);
        if (after < before - 1e-9) {
          improved = true;
        } else {
          reverseSegment(order, i, j);
        }
      }
    }
  }
}

const AVERAGE_URBAN_SPEED_KM_PER_HOUR = 18;
const MAX_TWO_OPT_PASSES = 25;

/**
 * Nearest-neighbor construction followed by a bounded 2-opt improvement pass.
 * Pure geographical distance optimization (Open TSP).
 */
export function optimizeRoute(
  origin: LatLng,
  stops: RouteStopCandidate[],
  now: Date = new Date(),
): OptimizedStop[] {
  if (stops.length === 0) return [];

  const remaining = [...stops];
  const order: RouteStopCandidate[] = [];
  let current: LatLng = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestCost = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cost = distanceKm(current, remaining[i]);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = i;
      }
    }
    const [next] = remaining.splice(bestIndex, 1);
    order.push(next);
    current = next;
  }

  improveWithTwoOpt(origin, order);

  let prev: LatLng = origin;
  return order.map((stop, index) => {
    const distanceFromPrevKm = distanceKm(prev, stop);
    prev = stop;
    return { pickupRequestId: stop.pickupRequestId, sequence: index + 1, distanceFromPrevKm };
  });
}

/** Rough per-leg ETA assuming dense-urban collector travel speed. Display-only estimate. */
export function estimateEtaMinutes(legDistanceKm: number): number {
  return Math.round((legDistanceKm / AVERAGE_URBAN_SPEED_KM_PER_HOUR) * 60);
}
