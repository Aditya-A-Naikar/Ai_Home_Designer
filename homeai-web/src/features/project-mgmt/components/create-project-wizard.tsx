"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Compass, 
  Layers, 
  ShieldCheck, 
  Sun,
  Box,
  CheckCircle2
} from "lucide-react";
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
import { AiProjectDiscovery } from "./ai-project-discovery";
import { StructuredProjectMemory } from "@/core/ai/conversational-intake";
import { Sparkles } from "lucide-react";

const typologyOptions: { 
  id: BuildingTypology; 
  label: string; 
  tagline: string; 
  defaultFloors: number;
  badge: string;
}[] = [
  { id: "duplex_vertical", label: "Duplex (G+1 Vertical)", tagline: "2-storey residence with internal stairs, void mezzanine & zoned privacy", defaultFloors: 2, badge: "2 LEVELS • RECOMMENDED" },
  { id: "single_family", label: "Single-Family Bungalow", tagline: "Single level sprawling residence with direct outdoor access", defaultFloors: 1, badge: "1 LEVEL" },
  { id: "villa", label: "Luxury Villa", tagline: "Multi-level independent estate with extensive outdoor courtyards", defaultFloors: 2, badge: "2+ LEVELS" },
  { id: "townhouse", label: "Townhouse / Rowhouse", tagline: "Narrow street frontage, optimized multi-level vertical efficiency", defaultFloors: 2, badge: "2 LEVELS" },
  { id: "duplex_side_by_side", label: "Side-by-Side Duplex", tagline: "Twin mirror-image homes with acoustic party wall separation", defaultFloors: 2, badge: "2 LEVELS" },
  { id: "apartment", label: "Apartment / Penthouse", tagline: "Single level luxury residence inside multi-unit envelope", defaultFloors: 1, badge: "1 LEVEL" },
];

const stairOptions: { id: StairType; label: string; desc: string }[] = [
  { id: "dog_leg", label: "Dog-Legged (L / U Shape)", desc: "Two parallel flights with mid-landing, compact & NBC standard" },
  { id: "straight", label: "Straight Flight", desc: "Single continuous linear run along focal accent wall" },
  { id: "open_well", label: "Open-Well (Grand)", desc: "Central opening ideal for double-height architectural lighting" },
  { id: "spiral", label: "Spiral / Helical", desc: "Space-saving circular steel/timber staircase" },
  { id: "cantilever", label: "Floating Cantilever", desc: "Minimalist structural treads anchored directly into masonry" },
];

const styleOptions: { id: ArchitecturalStyle; label: string; desc: string }[] = [
  { id: "modern", label: "Contemporary Modern", desc: "Clean lines, expansive glazing, open living volumes" },
  { id: "minimalist", label: "Minimalist Architectural", desc: "Pared-back materials, hidden storage, serene functional spaces" },
  { id: "indian_traditional", label: "Indian Contemporary", desc: "Courtyard ventilation, pooja orientation, shaded chajjas" },
  { id: "traditional", label: "Classic Traditional", desc: "Symmetrical proportions, pitched gables, tactile timber accents" },
  { id: "mixed", label: "Transitional Hybrid", desc: "Warm fusion of modern structural glass and natural materials" },
  { id: "antique", label: "Heritage Revival", desc: "Timeless craftsmanship, carved archways, heritage stone detailing" },
];

const spaceAmenities = [
  { id: "puja_room", label: "Puja / Prayer Sanctuary", desc: "Auspicious sacred zone in North-East quadrant" },
  { id: "home_office", label: "Home Studio / Study", desc: "Acoustically isolated professional workspace" },
  { id: "powder_room", label: "Guest Powder Room", desc: "Compact half-bath positioned near foyer or stair core" },
  { id: "car_porch", label: "Covered Car Porch", desc: "Driveway parking zone inside statutory front setback" },
  { id: "walk_in_closet", label: "Walk-In Dressing Suite", desc: "Master bedroom ensuite storage corridor" },
  { id: "utility_laundry", label: "Utility / Wash Yard", desc: "Rear kitchen service patio with appliance rough-ins" },
  { id: "balcony_sitout", label: "Balcony / Covered Sit-Out", desc: "Upper level outdoor terrace overlooking frontage" },
  { id: "double_height", label: "Double-Height Void", desc: "Cutout mezzanine slab with glass balustrade view" },
];

interface CreateProjectWizardProps {
  initialMode?: "ai_discovery" | "manual_cad";
}

export function CreateProjectWizard({ initialMode = "manual_cad" }: CreateProjectWizardProps = {}) {
  const router = useRouter();
  const [intakeMode, setIntakeMode] = useState<"ai_discovery" | "manual_cad">(initialMode);
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
      setErrors({ name: "Please enter a project title." });
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

  const handleSwitchToManual = (extractedMemory: StructuredProjectMemory) => {
    if (extractedMemory.projectName) setName(extractedMemory.projectName);
    setTypology(extractedMemory.typology);
    setFloorsCount(extractedMemory.floorsCount);
    setBhkCount(extractedMemory.bhkCount);
    setStyle(extractedMemory.architecturalStyle);
    setRoadFacing(extractedMemory.orientation);
    setStairType(extractedMemory.stairType);
    setVaastuCompliant(extractedMemory.vaastuCompliant);
    setBuildingCode(extractedMemory.buildingCode);
    setSelectedAmenities(extractedMemory.amenities);
    setPlotWidth(extractedMemory.plotDimensions.widthM);
    setPlotDepth(extractedMemory.plotDimensions.depthM);
    setIntakeMode("manual_cad");
  };

  if (intakeMode === "ai_discovery") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <AiProjectDiscovery onSwitchToManual={handleSwitchToManual} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Wizard Header */}
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              New Project Setup
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Create New Project
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure your home layout in 4 simple steps, or use the AI intake assistant.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIntakeMode("ai_discovery")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-700/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-xs font-medium text-cyan-300 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Guided Intake</span>
            </button>
            <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              Step {step} of 4
            </span>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { num: 1, label: "1. House Type" },
            { num: 2, label: "2. Plot & Setbacks" },
            { num: 3, label: "3. Rooms & Spaces" },
            { num: 4, label: "4. Style & Standards" },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-xl border transition-all ${
                step === s.num
                  ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300 font-semibold shadow-xs"
                  : step > s.num
                  ? "bg-slate-900/90 border-slate-700 text-emerald-400 font-medium"
                  : "bg-slate-900/40 border-slate-800/80 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{s.label}</span>
                {step > s.num && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Step Canvas */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl backdrop-blur-xs">
        {/* STEP 1: House Typology & Duplex Configuration */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">House Type & Levels</h2>
              <p className="mt-1 text-xs text-slate-400">
                Choose the structure of your residence. Multi-level duplexes automatically configure internal stairs and multi-floor coordination.
              </p>
            </div>

            {/* Project Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Name <span className="text-cyan-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Maple Creek Villa or Urban Duplex"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({});
                }}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
                autoFocus
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Typology Cards Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Residence Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      typology === opt.id
                        ? "border-cyan-500 bg-cyan-950/40 shadow-sm"
                        : "border-slate-800 bg-slate-950/50 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-sm text-white">{opt.label}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{opt.tagline}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duplex Architectural Specification Box */}
            {isDuplexSelected && (
              <div className="p-5 bg-slate-950/60 border border-cyan-800/40 rounded-xl space-y-4 text-xs">
                <div className="flex items-center gap-2 text-cyan-300 border-b border-slate-800 pb-3">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  <span className="font-semibold">Staircase & Multi-Level Options</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-2">
                    Connecting Staircase Style
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stairOptions.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStairType(s.id)}
                        className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          stairType === s.id
                            ? "bg-cyan-950/80 border-cyan-400 text-cyan-200"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className="block font-medium text-xs text-white">{s.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-slate-800">
                  <input
                    type="checkbox"
                    checked={doubleHeightVoid}
                    onChange={(e) => setDoubleHeightVoid(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Include Double-Height Living Room Ceiling</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Creates an open mezzanine opening with glass balustrade overlooking the ground-floor living area.
                    </p>
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
              <h2 className="text-lg font-bold text-white">Plot Size & Boundary Margins</h2>
              <p className="mt-1 text-xs text-slate-400">
                Specify your site boundary dimensions, road orientation for optimal sunlight, and required setback margins.
              </p>
            </div>

            {/* Measurement System Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Measurement System
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleUnitSystemChange("metric")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    unitSystem === "metric"
                      ? "border-cyan-500 bg-cyan-950/50 text-cyan-300 font-semibold"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Metric (Meters / m)
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitSystemChange("imperial")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                    unitSystem === "imperial"
                      ? "border-cyan-500 bg-cyan-950/50 text-cyan-300 font-semibold"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Imperial (Feet / ft)
                </button>
              </div>
            </div>

            {/* Plot Dimensions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Plot Width ({preferredUnit}) <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={plotWidth}
                  onChange={(e) => setPlotWidth(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Plot Depth ({preferredUnit}) <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={plotDepth}
                  onChange={(e) => setPlotDepth(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2 text-sm text-white focus:outline-hidden focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Road Facing Cardinal Compass */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                <span>Road Facing Direction (Main Entrance & Daylight)</span>
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { id: "N", label: "North (N)", hint: "Diffused Daylight" },
                  { id: "E", label: "East (E)", hint: "Morning Sunlight" },
                  { id: "S", label: "South (S)", hint: "All-Day Sunlight" },
                  { id: "W", label: "West (W)", hint: "Afternoon Light" },
                ].map((dir) => (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => setRoadFacing(dir.id as CompassOrientation)}
                    className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                      roadFacing === dir.id
                        ? "border-cyan-500 bg-cyan-950/60 font-semibold text-cyan-300"
                        : "border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="block font-semibold text-xs">{dir.label}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{dir.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Municipal Setbacks (Margins) */}
            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3 text-xs">
              <span className="font-semibold text-slate-300 block">
                Required Setback Margins ({preferredUnit})
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Front Setback</label>
                  <input
                    type="number"
                    step="0.5"
                    value={frontSetback}
                    onChange={(e) => setFrontSetback(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Rear Margin</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rearSetback}
                    onChange={(e) => setRearSetback(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Side Margins</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sideSetback}
                    onChange={(e) => setSideSetback(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Total Plot Area: <strong className="text-white font-mono">{formatArea(plotAreaSqMm, unitSystem)}</strong></span>
                <span className="text-cyan-400 font-semibold">Buildable Area: <span className="font-mono">{formatArea(buildableAreaSqMm, unitSystem)}</span></span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Space Programme (Room Schedule) */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Rooms & Dedicated Spaces</h2>
              <p className="mt-1 text-xs text-slate-400">
                Choose how many bedrooms you require, plus any specialized amenities.
              </p>
            </div>

            {/* BHK Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Bedrooms Configuration
              </label>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {[1, 2, 3, 4, 5].map((bhk) => (
                  <button
                    key={bhk}
                    type="button"
                    onClick={() => setBhkCount(bhk)}
                    className={`py-2 px-3 rounded-xl border text-center transition-colors cursor-pointer ${
                      bhkCount === bhk
                        ? "border-cyan-500 bg-cyan-950/60 font-semibold text-cyan-300"
                        : "border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="block font-semibold text-xs">{bhk} BHK</span>
                    <span className="text-[10px] text-slate-500 block">{bhk} Suites</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Specialized Amenities Grid */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Specialized Living Spaces
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {spaceAmenities.map((amenity) => {
                  const isChecked = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-cyan-950/40 border-cyan-500/60 text-slate-200"
                          : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-900"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-white block">{amenity.label}</span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{amenity.desc}</span>
                      </div>
                      <div className={`h-4 w-4 rounded-md shrink-0 flex items-center justify-center border ${isChecked ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-700"}`}>
                        {isChecked && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Style, Codes & Regulatory Standards */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Design Style & Standards</h2>
              <p className="mt-1 text-xs text-slate-400">
                Select your architectural aesthetic and statutory building code guidelines.
              </p>
            </div>

            {/* Architectural Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Architectural Style
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {styleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStyle(opt.id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      style === opt.id
                        ? "border-cyan-500 bg-cyan-950/40 text-cyan-200 font-semibold"
                        : "border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-white">{opt.label}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vaastu & Building Code Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div 
                onClick={() => setVaastuCompliant(!vaastuCompliant)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  vaastuCompliant ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300" : "bg-slate-950/50 border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className={`h-4 w-4 ${vaastuCompliant ? "text-emerald-400" : "text-slate-500"}`} />
                  <div>
                    <span className="text-xs font-semibold text-white block">Vaastu Shastra Guidance</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">South-East Kitchen, North-East Puja</span>
                  </div>
                </div>
                <div className={`h-4 w-4 rounded-md flex items-center justify-center border ${vaastuCompliant ? "bg-emerald-500 border-emerald-400 text-slate-950" : "border-slate-700"}`}>
                  {vaastuCompliant && <CheckCircle2 className="h-3 w-3" />}
                </div>
              </div>

              <div 
                onClick={() => setBuildingCode(buildingCode === "nbc" ? "ibc" : "nbc")}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">Building Code Standards</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {buildingCode === "nbc" ? "NBC 2024 (National Code)" : "IBC 2024 (International)"}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-300 uppercase border border-slate-700">
                  {buildingCode.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all shadow-md active:translate-y-0.5 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Creating Project...</span>
              ) : (
                <>
                  <Box className="h-3.5 w-3.5" />
                  <span>Create Project & Open Editor</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
