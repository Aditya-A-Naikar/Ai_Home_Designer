import { Project, Floor } from "@/core/domain/types";
import { SQ_MM_PER_SQ_M } from "@/core/units/converter";
import { polygonArea } from "@/core/geometry/room-utils";

export type CostTier = "economy" | "standard" | "premium";
export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

export interface BOQLineItem {
  id: string;
  category: "Substructure & Concrete" | "Masonry & Framing" | "Finishes & Flooring" | "Doors & Windows" | "Stairs & Balustrades" | "MEP Services";
  item: string;
  unit: "m³" | "m²" | "m" | "nos" | "kg";
  quantity: number;
  rate: number; // in selected currency
  amount: number; // quantity * rate
}

export interface MaterialTakeoffResult {
  builtUpAreaM2: number;
  carpetAreaM2: number;
  concreteVolumeM3: number;
  steelRebarKg: number;
  masonryVolumeM3: number;
  brickCountNos: number;
  plasterAreaM2: number;
  flooringAreaM2: number;
  doorsCount: number;
  windowsCount: number;
  stairsCount: number;
  balustradeLinearM: number;
  items: BOQLineItem[];
  subtotal: number;
  contingencyAmount: number; // 5% architectural contingency
  grandTotal: number;
  currency: CurrencyCode;
  costTier: CostTier;
}

// Unit Rates per Cost Tier (Default Base: INR ₹)
const RATES_INR: Record<CostTier, Record<string, number>> = {
  economy: {
    concrete: 6500, // per m³ (M25 design mix)
    steel: 72, // per kg (Fe500D TMT rebar)
    masonry: 4200, // per m³
    plaster: 280, // per m²
    flooring: 950, // per m² (vitrified tile)
    door: 8500, // per unit
    window: 7000, // per unit
    stair_flight: 35000, // per flight
    balustrade: 2200, // per linear m
    mep_point: 1200, // per point
  },
  standard: {
    concrete: 7800,
    steel: 82,
    masonry: 5200,
    plaster: 380,
    flooring: 1850, // per m² (teak / premium quartz)
    door: 16500, // per unit (flush timber veneer)
    window: 14000, // per unit (thermal break UPVC / powder aluminum)
    stair_flight: 65000,
    balustrade: 4500, // toughened glass with SS rail
    mep_point: 2200,
  },
  premium: {
    concrete: 9500,
    steel: 95,
    masonry: 6800,
    plaster: 550,
    flooring: 4200, // per m² (Italian Calacatta / hardwood)
    door: 32000, // solid teak / pivot
    window: 28000, // double-glazed slimline aluminum
    stair_flight: 140000, // floating cantilever / grand timber
    balustrade: 8500, // frameless laminated glass
    mep_point: 3800,
  },
};

// Currency conversion multipliers relative to INR
const CURRENCY_CONVERSION: Record<CurrencyCode, { symbol: string; rateFromInr: number }> = {
  INR: { symbol: "₹", rateFromInr: 1.0 },
  USD: { symbol: "$", rateFromInr: 1 / 86.5 },
  EUR: { symbol: "€", rateFromInr: 1 / 92.0 },
  GBP: { symbol: "£", rateFromInr: 1 / 108.0 },
};

/**
 * Calculates physical material quantities and priced Bill of Quantities (BOQ).
 */
export function calculateProjectBOQ(
  project: Project,
  costTier: CostTier = "standard",
  currency: CurrencyCode = "INR"
): MaterialTakeoffResult {
  const conv = CURRENCY_CONVERSION[currency];
  const rates = RATES_INR[costTier];
  const toCurr = (inr: number) => Number((inr * conv.rateFromInr).toFixed(2));

  let builtUpAreaSqMm = 0;
  let carpetAreaSqMm = 0;
  let grossMasonryVolumeM3 = 0;
  let openingDeductionsM3 = 0;
  let totalDoorsCount = 0;
  let totalWindowsCount = 0;
  let totalStairsCount = 0;
  let totalBalustradeM = 0;
  let totalColumnsVolumeM3 = 0;

  project.floors.forEach((floor: Floor) => {
    const floorHeightM = (floor.height || 3000) / 1000;

    // Carpet Area from Rooms
    floor.rooms.forEach((r) => {
      const roomArea = polygonArea(r.polygon);
      carpetAreaSqMm += roomArea;
      builtUpAreaSqMm += roomArea * 1.18; // Built-up typically ~18% higher than carpet area (walls + circulation)
    });

    // Walls & Openings Volume
    floor.walls.forEach((w) => {
      const dx = (w.end.x - w.start.x) / 1000;
      const dy = (w.end.y - w.start.y) / 1000;
      const lenM = Math.hypot(dx, dy);
      const thickM = (w.thickness || 150) / 1000;
      const grossVol = lenM * floorHeightM * thickM;
      grossMasonryVolumeM3 += grossVol;

      // Doors deduction
      w.doors?.forEach((d) => {
        totalDoorsCount++;
        const dArea = (d.width / 1000) * ((d.height || 2100) / 1000);
        openingDeductionsM3 += dArea * thickM;
      });

      // Windows deduction
      w.windows?.forEach((win) => {
        totalWindowsCount++;
        const winArea = (win.width / 1000) * ((win.height || 1200) / 1000);
        openingDeductionsM3 += winArea * thickM;
      });
    });

    // Columns Volume
    floor.columns?.forEach((col) => {
      const colWM = (col.width || 230) / 1000;
      const colDM = (col.depth || 450) / 1000;
      totalColumnsVolumeM3 += colWM * colDM * floorHeightM;
    });

    // Stairs & Voids Balustrades
    floor.stairs?.forEach((st) => {
      totalStairsCount++;
      totalBalustradeM += (st.length || 2400) / 1000;
    });

    floor.voids?.forEach((v) => {
      if (v.polygon && v.polygon.length >= 3) {
        for (let i = 0; i < v.polygon.length; i++) {
          const p1 = v.polygon[i];
          const p2 = v.polygon[(i + 1) % v.polygon.length];
          const edgeM = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 1000;
          totalBalustradeM += edgeM;
        }
      }
    });
  });

  const carpetAreaM2 = Number((carpetAreaSqMm / SQ_MM_PER_SQ_M).toFixed(1));
  const builtUpAreaM2 = Number((builtUpAreaSqMm / SQ_MM_PER_SQ_M).toFixed(1));

  // Net Masonry Volume
  const netMasonryVolumeM3 = Math.max(0, Number((grossMasonryVolumeM3 - openingDeductionsM3).toFixed(2)));
  const brickCountNos = Math.round(netMasonryVolumeM3 * 500); // 500 bricks per m³

  // Slab Concrete: 150mm thick slab for built-up footprint
  const slabConcreteM3 = builtUpAreaM2 * 0.15;
  const concreteVolumeM3 = Number((slabConcreteM3 + totalColumnsVolumeM3).toFixed(2));
  const steelRebarKg = Math.round(concreteVolumeM3 * 85); // 85kg steel per m³ RCC

  // Plaster & Flooring Areas
  const plasterAreaM2 = Number((netMasonryVolumeM3 * 2.2 * 5).toFixed(1)); // Approx surface area
  const flooringAreaM2 = carpetAreaM2;

  // Total MEP services points
  const totalMepPoints = (totalDoorsCount + totalWindowsCount) * 4 + 10;

  // Build Itemized BOQ
  const items: BOQLineItem[] = [
    {
      id: "boq-1",
      category: "Substructure & Concrete",
      item: "Reinforced Cement Concrete (RCC M25 / Slabs & Columns)",
      unit: "m³",
      quantity: concreteVolumeM3,
      rate: toCurr(rates.concrete),
      amount: Number((concreteVolumeM3 * toCurr(rates.concrete)).toFixed(2)),
    },
    {
      id: "boq-2",
      category: "Substructure & Concrete",
      item: "Structural High-Yield TMT Steel Rebar (Fe500D)",
      unit: "kg",
      quantity: steelRebarKg,
      rate: toCurr(rates.steel),
      amount: Number((steelRebarKg * toCurr(rates.steel)).toFixed(2)),
    },
    {
      id: "boq-3",
      category: "Masonry & Framing",
      item: "Brickwork / AAC Block Masonry in Cement Mortar (1:6)",
      unit: "m³",
      quantity: netMasonryVolumeM3,
      rate: toCurr(rates.masonry),
      amount: Number((netMasonryVolumeM3 * toCurr(rates.masonry)).toFixed(2)),
    },
    {
      id: "boq-4",
      category: "Finishes & Flooring",
      item: "Interior & Exterior Smooth Cement Plaster & Emulsion Paint",
      unit: "m²",
      quantity: plasterAreaM2,
      rate: toCurr(rates.plaster),
      amount: Number((plasterAreaM2 * toCurr(rates.plaster)).toFixed(2)),
    },
    {
      id: "boq-5",
      category: "Finishes & Flooring",
      item: "Premium Architectural Flooring (Hardwood / Marble / Tile)",
      unit: "m²",
      quantity: flooringAreaM2,
      rate: toCurr(rates.flooring),
      amount: Number((flooringAreaM2 * toCurr(rates.flooring)).toFixed(2)),
    },
    {
      id: "boq-6",
      category: "Doors & Windows",
      item: "Engineered Door Assemblies (Frames, Shutters & Hardware)",
      unit: "nos",
      quantity: totalDoorsCount,
      rate: toCurr(rates.door),
      amount: Number((totalDoorsCount * toCurr(rates.door)).toFixed(2)),
    },
    {
      id: "boq-7",
      category: "Doors & Windows",
      item: "Architectural Window Glazing & Louvers",
      unit: "nos",
      quantity: totalWindowsCount,
      rate: toCurr(rates.window),
      amount: Number((totalWindowsCount * toCurr(rates.window)).toFixed(2)),
    },
    {
      id: "boq-8",
      category: "Stairs & Balustrades",
      item: "Prefabricated Stair Flights (Risers, Treads & Stringers)",
      unit: "nos",
      quantity: totalStairsCount,
      rate: toCurr(rates.stair_flight),
      amount: Number((totalStairsCount * toCurr(rates.stair_flight)).toFixed(2)),
    },
    {
      id: "boq-9",
      category: "Stairs & Balustrades",
      item: "Toughened Glass Balustrades with Stainless Steel Handrail",
      unit: "m",
      quantity: Number(totalBalustradeM.toFixed(1)),
      rate: toCurr(rates.balustrade),
      amount: Number((totalBalustradeM * toCurr(rates.balustrade)).toFixed(2)),
    },
    {
      id: "boq-10",
      category: "MEP Services",
      item: "Electrical, Sanitary Plumbing & HVAC Conduit Infrastructure",
      unit: "nos",
      quantity: totalMepPoints,
      rate: toCurr(rates.mep_point),
      amount: Number((totalMepPoints * toCurr(rates.mep_point)).toFixed(2)),
    },
  ];

  const subtotal = Number(items.reduce((acc, it) => acc + it.amount, 0).toFixed(2));
  const contingencyAmount = Number((subtotal * 0.05).toFixed(2)); // 5% standard design contingency
  const grandTotal = Number((subtotal + contingencyAmount).toFixed(2));

  return {
    builtUpAreaM2,
    carpetAreaM2,
    concreteVolumeM3,
    steelRebarKg,
    masonryVolumeM3: netMasonryVolumeM3,
    brickCountNos,
    plasterAreaM2,
    flooringAreaM2,
    doorsCount: totalDoorsCount,
    windowsCount: totalWindowsCount,
    stairsCount: totalStairsCount,
    balustradeLinearM: Number(totalBalustradeM.toFixed(1)),
    items,
    subtotal,
    contingencyAmount,
    grandTotal,
    currency,
    costTier,
  };
}
