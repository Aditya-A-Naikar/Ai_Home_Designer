"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Compass, 
  Sparkles, 
  Layers, 
  ShieldAlert, 
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArchitecturalStyle, 
  BuildingTypology, 
  CompassOrientation, 
  PreferredUnit, 
  StairType, 
  UnitSystem 
} from "@/core/domain/types";
import { toMillimeters, formatArea } from "@/core/units/converter";
import { createProject } from "@/core/domain/project-factory";
import { projectRepository } from "@/infrastructure/persistence/local-storage-project-repository";

const typologyOptions: { 
  id: BuildingTypology; 
  label: string; 
  tagline: string; 
  defaultFloors: number;
  icon: string;
}[] = [
  { id: "single_family", label: "Single-Family Home", tagline: "Single level ranch/bungalow layout", defaultFloors: 1, icon: "🏠" },
  { id: "duplex_vertical", label: "Duplex (G+1 Vertical)", tagline: "2-storey single residence with internal stairs & void", defaultFloors: 2, icon: "🏢" },
  { id: "duplex_side_by_side", label: "Side-by-Side Duplex", tagline: "Twin mirror-image homes with shared party wall", defaultFloors: 2, icon: "🏘️" },
  { id: "villa", label: "Luxury Villa", tagline: "Multi-level independent estate with outdoor spaces", defaultFloors: 2, icon: "🏰" },
  { id: "apartment", label: "Apartment / Flat", tagline: "Single level residence inside a multi-unit complex", defaultFloors: 1, icon: "🏬" },
  { id: "townhouse", label: "Townhouse / Rowhouse", tagline: "Narrow street frontage, multi-level vertical living", defaultFloors: 2, icon: "🏡" },
];

const stairOptions: { id: StairType; label: string; desc: string }[] = [
  { id: "dog_leg", label: "Dog-Legged (L / U Shape)", desc: "Two parallel flights with mid-landing, compact & standard" },
  { id: "straight", label: "Straight Flight", desc: "Single continuous linear run along a focal wall" },
  { id: "open_well", label: "Open-Well (Grand)", desc: "Spacious central well, ideal for double-height chandeliers" },
  { id: "spiral", label: "Spiral / Helical", desc: "Space-saving architectural circular staircase" },
  { id: "cantilever", label: "Floating Cantilever", desc: "Minimalist steps emerging directly out of the wall" },
];

const styleOptions: { id: ArchitecturalStyle; label: string; desc: string }[] = [
  { id: "modern", label: "Modern", desc: "Clean lines, open plans, large glass panels" },
  { id: "minimalist", label: "Minimalist", desc: "Function-focused, uncluttered, serene spaces" },
  { id: "traditional", label: "Traditional", desc: "Classic proportion, warmth, symmetrical elements" },
  { id: "indian_traditional", label: "Indian Traditional", desc: "Courtyard concepts, pooja spaces, cross-breezes" },
  { id: "antique", label: "Heritage / Antique", desc: "Timeless craftsmanship, rich timber, classic archways" },
  { id: "mixed", label: "Transitional / Mixed", desc: "Balanced blend of contemporary and timeless accents" },
];

const spaceAmenities = [
  { id: "puja_room", label: "Puja / Prayer Room", icon: "🪔", desc: "Auspicious sacred zone in North-East" },
  { id: "home_office", label: "Home Office / Study", icon: "💼", desc: "Dedicated workspace with quiet acoustic buffer" },
  { id: "powder_room", label: "Powder Room", icon: "🚻", desc: "Compact guest half-bath under staircase / living" },
  { id: "car_porch", label: "Covered Car Porch", icon: "🚗", desc: "Driveway parking space within front setback" },
  { id: "walk_in_closet", label: "Walk-In Wardrobe", icon: "👔", desc: "Master bedroom ensuite dressing suite" },
  { id: "utility_laundry", label: "Utility / Wash Yard", icon: "🧺", desc: "Kitchen back utility with washing machine connection" },
  { id: "balcony_sitout", label: "Balcony / Sit-Out", icon: "🌿", desc: "Upper floor outdoor terrace overlooking street" },
  { id: "double_height", label: "Double-Height Void", icon: "✨", desc: "High ceiling opening from ground to first floor" },
];

export function CreateProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Step 1
  const [name, setName] = useState("");
  const description = "";
  const [typology, setTypology] = useState<BuildingTypology>("duplex_vertical");
  const [stairType, setStairType] = useState<StairType>("dog_leg");
  const [doubleHeightVoid, setDoubleHeightVoid] = useState(true);

  // Form State: Step 2
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [plotWidth, setPlotWidth] = useState<number>(15); // 15m or 50ft
  const [plotDepth, setPlotDepth] = useState<number>(12); // 12m or 40ft
  const [roadFacing, setRoadFacing] = useState<CompassOrientation>("N");
  const [frontSetback, setFrontSetback] = useState<number>(3.0); // 3m
  const [rearSetback, setRearSetback] = useState<number>(1.5); // 1.5m
  const [sideSetback, setSideSetback] = useState<number>(1.5); // 1.5m
  const [floorsCount, setFloorsCount] = useState<number>(2);

  // Form State: Step 3 (Space Programme)
  const [bhkCount, setBhkCount] = useState<number>(3); // 3 BHK default
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "puja_room",
    "home_office",
    "powder_room",
    "car_porch",
    "balcony_sitout",
    "double_height",
  ]);

  // Form State: Step 4 (Style & Code Standards)
  const [style, setStyle] = useState<ArchitecturalStyle>("modern");
  const [vaastuCompliant, setVaastuCompliant] = useState(true);
  const [buildingCode, setBuildingCode] = useState<"nbc" | "ibc">("nbc");
  const [selectedPriorities] = useState<string[]>([
    "Maximum Natural Light",
    "Open Floor Plan",
    "Vaastu Aligned",
  ]);

  const [errors, setErrors] = useState<{ name?: string; dimensions?: string }>({});

  const preferredUnit: PreferredUnit = unitSystem === "metric" ? "m" : "ft";

  const handleUnitSystemChange = (newSystem: UnitSystem) => {
    setUnitSystem(newSystem);
    if (newSystem === "metric") {
      setPlotWidth(15);
      setPlotDepth(12);
      setFrontSetback(3.0);
      setRearSetback(1.5);
      setSideSetback(1.5);
    } else {
      setPlotWidth(50);
      setPlotDepth(40);
      setFrontSetback(10);
      setRearSetback(5);
      setSideSetback(5);
    }
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const validateStep1 = () => {
    if (!name.trim()) {
      setErrors({ name: "Please enter a project name." });
      return false;
    }
    setErrors({});
    return true;
  };

  const validateStep2 = () => {
    if (plotWidth <= 0 || plotDepth <= 0) {
      setErrors({ dimensions: "Plot dimensions must be greater than zero." });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) setStep(4);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) setStep(3);
  };

  const handleCreate = async () => {
    if (!validateStep1() || !validateStep2()) return;

    try {
      setIsSubmitting(true);
      const plotWidthMm = toMillimeters(plotWidth, preferredUnit);
      const plotDepthMm = toMillimeters(plotDepth, preferredUnit);
      const frontSetbackMm = toMillimeters(frontSetback, preferredUnit);
      const rearSetbackMm = toMillimeters(rearSetback, preferredUnit);
      const sideSetbackMm = toMillimeters(sideSetback, preferredUnit);

      const isDuplex = typology === "duplex_vertical" || typology === "duplex_side_by_side";

      const finalPriorities = [...selectedPriorities];
      if (vaastuCompliant && !finalPriorities.includes("Vaastu Aligned")) {
        finalPriorities.push("Vaastu Aligned");
      }
      finalPriorities.push(`${bhkCount} BHK Layout`);

      const project = createProject({
        name,
        description,
        plotWidthMm,
        plotDepthMm,
        preferredUnit,
        unitSystem,
        floorsCount: isDuplex ? Math.max(2, floorsCount) : floorsCount,
        style,
        typology,
        siteContext: {
          roadFacing,
          northAngleDegrees: roadFacing === "N" ? 0 : roadFacing === "E" ? 90 : roadFacing === "S" ? 180 : 270,
          setbacks: {
            front: frontSetbackMm,
            rear: rearSetbackMm,
            left: sideSetbackMm,
            right: sideSetbackMm,
          },
        },
        duplexConfig: isDuplex ? {
          internalStairs: true,
          doubleHeightVoid: doubleHeightVoid,
          stairType: stairType,
        } : undefined,
        priorities: finalPriorities,
        constraints: [
          `Building Code: ${buildingCode.toUpperCase()}`,
          ...(vaastuCompliant ? ["Strict Vaastu Shastra Orientation"] : []),
          ...selectedAmenities.map(a => `Include ${a.replace('_', ' ')}`),
        ],
      });

      await projectRepository.save(project);
      router.push(`/editor/${project.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setIsSubmitting(false);
    }
  };

  const plotAreaSqMm = toMillimeters(plotWidth, preferredUnit) * toMillimeters(plotDepth, preferredUnit);
  const buildableWidth = Math.max(0, plotWidth - sideSetback * 2);
  const buildableDepth = Math.max(0, plotDepth - frontSetback - rearSetback);
  const buildableAreaSqMm = toMillimeters(buildableWidth, preferredUnit) * toMillimeters(buildableDepth, preferredUnit);

  const isDuplexSelected = typology === "duplex_vertical" || typology === "duplex_side_by_side";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* 4-Step Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "House Typology" },
            { num: 2, label: "Plot & Orientation" },
            { num: 3, label: "Room Checklist" },
            { num: 4, label: "Style & Codes" },
          ].map((s, idx, arr) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    step >= s.num ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {s.num}
                </span>
                <span className={`text-xs sm:text-sm font-medium ${step >= s.num ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {idx < arr.length - 1 && <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${step > s.num ? "bg-indigo-600" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 sm:p-8">
          {/* STEP 1: House Typology & Duplex Configuration */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What are we building?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select your home typology. Choose Duplex for 2-level homes with internal stairs and private zoning.
                </p>
              </div>

              <div>
                <Label htmlFor="projectName" required>Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Modern Sunset Duplex Villa"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({});
                  }}
                  error={errors.name}
                  autoFocus
                />
              </div>

              {/* Typology Cards Grid */}
              <div>
                <Label required>House Typology</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                  {typologyOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setTypology(opt.id);
                        if (opt.id === "duplex_vertical" || opt.id === "duplex_side_by_side" || opt.id === "villa") {
                          setFloorsCount(2);
                        } else {
                          setFloorsCount(1);
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        typology === opt.id
                          ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{opt.icon}</span>
                        <span className="font-bold text-sm text-slate-900">{opt.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">{opt.tagline}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duplex-Specific Configuration Box */}
              {isDuplexSelected && (
                <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <span className="font-bold text-sm text-indigo-950">Duplex Architectural Details</span>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-700">Internal Connecting Staircase Style</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {stairOptions.slice(0, 4).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStairType(s.id)}
                          className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                            stairType === s.id
                              ? "bg-white border-indigo-600 font-semibold text-indigo-900 shadow-xs ring-1 ring-indigo-500"
                              : "bg-white/80 border-indigo-100 text-slate-700 hover:bg-white"
                          }`}
                        >
                          <span className="block font-bold">{s.label}</span>
                          <span className="text-[11px] text-slate-500">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Double-Height Void Checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={doubleHeightVoid}
                      onChange={(e) => setDoubleHeightVoid(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">Include Double-Height Living Room Void</span>
                      <p className="text-[11px] text-slate-500">First floor ceiling opens to below, creating an airy luxury architectural feel.</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Plot, Road Facing & Municipal Setbacks */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Plot Dimensions & Setbacks</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define your boundary and mandatory municipal setbacks (margins) to delineate buildable space.
                </p>
              </div>

              {/* Unit System Toggle */}
              <div>
                <Label>Measurement System</Label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => handleUnitSystemChange("metric")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      unitSystem === "metric"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Metric (Meters / m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitSystemChange("imperial")}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                      unitSystem === "imperial"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Imperial (Feet / ft)
                  </button>
                </div>
              </div>

              {/* Width & Depth */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="plotWidth" required>Plot Width ({preferredUnit})</Label>
                  <Input
                    id="plotWidth"
                    type="number"
                    min="1"
                    step="0.5"
                    value={plotWidth}
                    onChange={(e) => setPlotWidth(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="plotDepth" required>Plot Depth / Length ({preferredUnit})</Label>
                  <Input
                    id="plotDepth"
                    type="number"
                    min="1"
                    step="0.5"
                    value={plotDepth}
                    onChange={(e) => setPlotDepth(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Road Facing Cardinal Compass */}
              <div>
                <Label className="flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-indigo-600" />
                  <span>Road Facing / Front Orientation</span>
                </Label>
                <p className="text-xs text-slate-500 mb-2">Crucial for main gate entrance and Vaastu daylight planning.</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "N", label: "North Facing", hint: "High Daylight" },
                    { id: "E", label: "East Facing", hint: "Morning Sun" },
                    { id: "S", label: "South Facing", hint: "Warm Winters" },
                    { id: "W", label: "West Facing", hint: "Evening Sun" },
                  ].map((dir) => (
                    <button
                      key={dir.id}
                      type="button"
                      onClick={() => setRoadFacing(dir.id as CompassOrientation)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        roadFacing === dir.id
                          ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700 shadow-xs ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-xs font-bold">{dir.label}</span>
                      <span className="text-[10px] text-slate-400">{dir.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Municipal Setbacks (Margins) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-xs text-slate-800 block">Mandatory Setbacks / Margins ({preferredUnit})</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Front (Road)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={frontSetback}
                      onChange={(e) => setFrontSetback(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Rear (Backyard)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={rearSetback}
                      onChange={(e) => setRearSetback(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Side Margins</label>
                    <input
                      type="number"
                      step="0.5"
                      value={sideSetback}
                      onChange={(e) => setSideSetback(Number(e.target.value))}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-600">Total Plot Footprint: <strong>{formatArea(plotAreaSqMm, unitSystem)}</strong></span>
                  <span className="text-indigo-700 font-semibold">Max Buildable Footprint: {formatArea(buildableAreaSqMm, unitSystem)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Space Programme (Room Checklist & Programme) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Space Programme (Room Schedule)</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select your bedroom configuration and specialized amenities for architectural layout generation.
                </p>
              </div>

              {/* BHK Selector */}
              <div>
                <Label>Bedrooms & Suites Configuration</Label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((bhk) => (
                    <button
                      key={bhk}
                      type="button"
                      onClick={() => setBhkCount(bhk)}
                      className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                        bhkCount === bhk
                          ? "border-indigo-600 bg-indigo-50 font-bold text-indigo-700 shadow-xs ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-xs font-bold">{bhk} BHK</span>
                      <span className="text-[10px] text-slate-400">{bhk} Bed</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Specialized Spaces & Amenities */}
              <div>
                <Label>Include Specific Functional Rooms & Features</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                  {spaceAmenities.map((amenity) => {
                    const isChecked = selectedAmenities.includes(amenity.id);
                    return (
                      <button
                        key={amenity.id}
                        type="button"
                        onClick={() => toggleAmenity(amenity.id)}
                        className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-400 text-indigo-950 font-medium"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-lg leading-none shrink-0">{amenity.icon}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block">{amenity.label}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight">{amenity.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Style, Codes & Lifestyle Priorities */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Style, Vaastu & Regulatory Codes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define your visual identity and compliance standards to guide the AI co-pilot.
                </p>
              </div>

              {/* Architectural Style */}
              <div>
                <Label>Architectural Style</Label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 mt-1">
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStyle(opt.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        style === opt.id
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-900">{opt.label}</span>
                      <span className="text-[11px] text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vaastu Shastra & Building Code Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div 
                  onClick={() => setVaastuCompliant(!vaastuCompliant)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    vaastuCompliant ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun className={`h-4 w-4 ${vaastuCompliant ? "text-emerald-600" : "text-slate-400"}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Vaastu Shastra Compliance</span>
                      <span className="text-[10px] text-slate-500">SE Kitchen, SW Master Bed, NE Puja</span>
                    </div>
                  </div>
                  <input type="checkbox" checked={vaastuCompliant} readOnly className="h-4 w-4 text-emerald-600 rounded" />
                </div>

                <div 
                  onClick={() => setBuildingCode(buildingCode === "nbc" ? "ibc" : "nbc")}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-indigo-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Building Code Standard</span>
                      <span className="text-[10px] text-slate-500">{buildingCode === "nbc" ? "NBC 2016 (National Building Code)" : "IBC 2024 (International Building Code)"}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">{buildingCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : <div />}

            {step < 4 ? (
              <Button type="button" onClick={handleNext} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                {isSubmitting ? (
                  <span>Architecting Project...</span>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Launch CAD Studio</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
