// Approximate CO2-equivalent emissions avoided per kg of material recycled
// vs. landfilled, adapted from EPA WARM (Waste Reduction Model) v16
// methodology. These are simplified, single representative values per
// WasteCategory — real-world factors vary by sub-material (e.g. aluminum
// vs. steel under METAL). Intended for engagement-level impact reporting,
// not scientific carbon accounting — documented here for the viva.

import { WasteCategory, LoadSize } from "@prisma/client";

// kg CO2e avoided per kg of material recycled instead of landfilled
export const CO2_FACTORS_KG_PER_KG: Record<WasteCategory, number> = {
  PLASTIC: 1.87,
  PAPER: 3.3,
  GLASS: 0.31,
  METAL: 2.0,
  ORGANIC: 0.25,
  ELECTRONIC: 1.0,
};

// Rough relative weight estimate (kg) per LoadSize — used only to split a
// pickup's single measured weight across multiple item categories
// proportionally when one pickup has more than one category.
export const LOAD_SIZE_KG_ESTIMATE: Record<LoadSize, number> = {
  SMALL: 5,
  MEDIUM: 15,
  LARGE: 30,
  EXTRA_LARGE: 50,
};

// Average passenger vehicle emission rate (~0.251 kg CO2/km, EPA-based),
// used to express savings as "equivalent to X km not driven".
export const KG_CO2_PER_KM_DRIVEN = 0.251;