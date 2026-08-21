import type { RoutingMatrix } from "./osrmClient";
import type { LatLng } from "./geoDistance";

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
  etaMinutes: number;
}

// We work with array of indices: 0 is origin, 1..N are the candidates in order.
// `orderIndices` only contains the candidate indices (1..N).
function pathCost(orderIndices: number[], matrix: RoutingMatrix): number {
  let total = 0;
  let prevIndex = 0; // origin is index 0
  for (const index of orderIndices) {
    total += matrix.durationsMin[prevIndex][index];
    prevIndex = index;
  }
  return total;
}

function reverseSegment(orderIndices: number[], from: number, to: number): void {
  let left = from;
  let right = to;
  while (left < right) {
    [orderIndices[left], orderIndices[right]] = [orderIndices[right], orderIndices[left]];
    left += 1;
    right -= 1;
  }
}

function improveWithTwoOpt(orderIndices: number[], matrix: RoutingMatrix): void {
  if (orderIndices.length < 3) return;

  let improved = true;
  let passes = 0;
  while (improved && passes < MAX_TWO_OPT_PASSES) {
    improved = false;
    passes += 1;
    for (let i = 0; i < orderIndices.length - 1; i++) {
      for (let j = i + 1; j < orderIndices.length; j++) {
        const before = pathCost(orderIndices, matrix);
        reverseSegment(orderIndices, i, j);
        const after = pathCost(orderIndices, matrix);
        if (after < before - 1e-9) {
          improved = true;
        } else {
          reverseSegment(orderIndices, i, j);
        }
      }
    }
  }
}

const MAX_TWO_OPT_PASSES = 25;

/**
 * Nearest-neighbor construction followed by a bounded 2-opt improvement pass.
 * Optimized for road travel time using the provided RoutingMatrix.
 */
export function optimizeRoute(
  stops: RouteStopCandidate[],
  matrix: RoutingMatrix
): OptimizedStop[] {
  if (stops.length === 0) return [];

  // Indices: 0 is origin. 1 to stops.length are candidates.
  const remaining = Array.from({ length: stops.length }, (_, i) => i + 1);
  const orderIndices: number[] = [];
  let currentIndex = 0;

  while (remaining.length > 0) {
    let bestRemainingIndex = 0;
    let bestCost = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidateIndex = remaining[i];
      const cost = matrix.durationsMin[currentIndex][candidateIndex];
      if (cost < bestCost) {
        bestCost = cost;
        bestRemainingIndex = i;
      }
    }
    const [nextIndex] = remaining.splice(bestRemainingIndex, 1);
    orderIndices.push(nextIndex);
    currentIndex = nextIndex;
  }

  improveWithTwoOpt(orderIndices, matrix);

  let prevIndex = 0;
  return orderIndices.map((index, i) => {
    const stop = stops[index - 1]; // because candidates are 1..N
    const distanceFromPrevKm = matrix.distancesKm[prevIndex][index];
    const etaMinutes = matrix.durationsMin[prevIndex][index];
    prevIndex = index;
    return {
      pickupRequestId: stop.pickupRequestId,
      sequence: i + 1,
      distanceFromPrevKm,
      etaMinutes: Math.round(etaMinutes),
    };
  });
}
