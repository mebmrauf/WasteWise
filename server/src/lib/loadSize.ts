import { LoadSize } from "@prisma/client";

export interface LoadSizeKgRange {
  minKg: number;
  maxKg: number;
}

export const LOAD_SIZE_KG_RANGES: Record<LoadSize, LoadSizeKgRange> = {
  SMALL: { minKg: 1, maxKg: 3 },
  MEDIUM: { minKg: 3, maxKg: 8 },
  LARGE: { minKg: 8, maxKg: 15 },
  EXTRA_LARGE: { minKg: 15, maxKg: 25 },
};

export function getLoadSizeKgRange(loadSize: LoadSize): LoadSizeKgRange {
  return LOAD_SIZE_KG_RANGES[loadSize];
}
