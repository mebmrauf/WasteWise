import { logger } from "./logger";
import { distanceKm, type LatLng } from "./geoDistance";

export interface RoutingMatrix {
  distancesKm: number[][]; // [fromIndex][toIndex]
  durationsMin: number[][]; // [fromIndex][toIndex]
}

const AVERAGE_URBAN_SPEED_KM_PER_HOUR = 18;

function createHaversineFallbackMatrix(points: LatLng[]): RoutingMatrix {
  const size = points.length;
  const distancesKm: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
  const durationsMin: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i !== j) {
        const d = distanceKm(points[i], points[j]);
        distancesKm[i][j] = d;
        durationsMin[i][j] = (d / AVERAGE_URBAN_SPEED_KM_PER_HOUR) * 60;
      }
    }
  }

  return { distancesKm, durationsMin };
}

export async function getRoutingMatrix(origin: LatLng, candidates: LatLng[]): Promise<RoutingMatrix> {
  const points = [origin, ...candidates];
  if (points.length < 2) {
    return { distancesKm: [[0]], durationsMin: [[0]] };
  }

  try {
    // Coordinates must be longitude,latitude separated by semicolon
    const coordinatesStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
    
    // OSRM Public API limits table to 100 coordinates
    if (points.length > 100) {
      logger.warn("OSRM limit exceeded (max 100 coordinates), using Haversine fallback");
      return createHaversineFallbackMatrix(points);
    }

    const url = `https://router.project-osrm.org/table/v1/driving/${coordinatesStr}?annotations=distance,duration`;
    
    const response = await fetch(url, {
      // OSRM requires a valid user-agent, or it might reject requests
      headers: {
        "User-Agent": "WasteWise-Routing-App/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;

    if (data.code !== "Ok" || !data.distances || !data.durations) {
      throw new Error(`OSRM API returned non-Ok code or missing data: ${data.code}`);
    }

    // Convert distances from meters to km
    const distancesKm = data.distances.map((row: number[]) => 
      row.map((meters: number | null) => (meters !== null ? meters / 1000 : Infinity))
    );

    // Convert durations from seconds to minutes
    const durationsMin = data.durations.map((row: number[]) => 
      row.map((seconds: number | null) => (seconds !== null ? seconds / 60 : Infinity))
    );

    return { distancesKm, durationsMin };

  } catch (error) {
    logger.error({ err: error }, "Failed to fetch routing matrix from OSRM, falling back to Haversine distance");
    return createHaversineFallbackMatrix(points);
  }
}
