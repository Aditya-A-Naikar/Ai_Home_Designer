"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArchitecturalStyle, PreferredUnit, UnitSystem } from "@/core/domain/types";
import { toMillimeters, formatArea } from "@/core/units/converter";
import { createProject } from "@/core/domain/project-factory";
import { projectRepository } from "@/infrastructure/persistence/local-storage-project-repository";

const styleOptions: { id: ArchitecturalStyle; label: string; desc: string }[] = [
  { id: "modern", label: "Modern", desc: "Clean lines, open plans, large glass panels" },
  { id: "minimalist", label: "Minimalist", desc: "Function-focused, uncluttered, serene spaces" },
  { id: "traditional", label: "Traditional", desc: "Classic proportion, warmth, symmetrical elements" },
  { id: "indian_traditional", label: "Indian Traditional", desc: "Courtyard concepts, pooja spaces, cross-breezes" },
  { id: "antique", label: "Heritage / Antique", desc: "Timeless craftsmanship, rich timber, classic archways" },
  { id: "mixed", label: "Transitional / Mixed", desc: "Balanced blend of contemporary and timeless accents" },
];

const priorityTags = [
  "Maximum Natural Light",
  "Open Floor Plan",
  "Privacy from Street",
  "Vaastu Aligned",
  "Home Office / Study",
  "Ground Floor Bedroom",
  "Spacious Kitchen & Pantry",
  "Patio / Garden Connection",
];

export function CreateProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [plotWidth, setPlotWidth] = useState<number>(15); // 15m or 50ft
  const [plotDepth, setPlotDepth] = useState<number>(12); // 12m or 40ft
  const [floorsCount, setFloorsCount] = useState<number>(1);
  const [style, setStyle] = useState<ArchitecturalStyle>("modern");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([
    "Maximum Natural Light",
    "Open Floor Plan",
  ]);
  const [errors, setErrors] = useState<{ name?: string; dimensions?: string }>({});

  const preferredUnit: PreferredUnit = unitSystem === "metric" ? "m" : "ft";

  const handleUnitSystemChange = (newSystem: UnitSystem) => {
    setUnitSystem(newSystem);
    if (newSystem === "metric") {
      setPlotWidth(15);
      setPlotDepth(12);
    } else {
      setPlotWidth(50);
      setPlotDepth(40);
    }
  };

  const togglePriority = (tag: string) => {
    setSelectedPriorities((prev) =>
      prev.includes(tag) ? prev.filter((p) => p !== tag) : [...prev, tag]
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
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleCreate = async () => {
    if (!validateStep1() || !validateStep2()) return;

    try {
      setIsSubmitting(true);
      const plotWidthMm = toMillimeters(plotWidth, preferredUnit);
      const plotDepthMm = toMillimeters(plotDepth, preferredUnit);

      const project = createProject({
        name,
        description,
        plotWidthMm,
        plotDepthMm,
        preferredUnit,
        unitSystem,
        floorsCount,
        style,
        priorities: selectedPriorities,
      });

      await projectRepository.save(project);
      router.push(`/editor/${project.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setIsSubmitting(false);
    }
  };

  const plotAreaSqMm =
    toMillimeters(plotWidth, preferredUnit) * toMillimeters(plotDepth, preferredUnit);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= 1 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              1
            </span>
            <span className="text-sm font-medium text-slate-700">Project Info</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200 sm:w-20" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= 2 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              2
            </span>
            <span className="text-sm font-medium text-slate-700">Plot & Floors</span>
          </div>
          <div className="h-0.5 w-12 bg-slate-200 sm:w-20" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === 3 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              3
            </span>
            <span className="text-sm font-medium text-slate-700">Style & Goals</span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8">
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Name your project</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Give your home design a title to easily recognize it on your dashboard.
                </p>
              </div>

              <div>
                <Label htmlFor="projectName" required>
                  Project Name
                </Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Hilltop Contemporary Villa"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({});
                  }}
                  error={errors.name}
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="projectDesc">Description / Notes (Optional)</Label>
                <textarea
                  id="projectDesc"
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 shadow-sm focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  placeholder="e.g. 3-bedroom layout with a focus on open spaces and garden connection."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Plot Dimensions & Floors */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Plot & Dimensions</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Set the boundary dimensions of your site and number of levels.
                </p>
              </div>

              {/* Unit System Toggle */}
              <div>
                <Label>Measurement System</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleUnitSystemChange("metric")}
                    className={`flex items-center justify-center rounded-lg border p-3 text-sm font-medium transition-all ${
                      unitSystem === "metric"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Metric (Meters / m)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnitSystemChange("imperial")}
                    className={`flex items-center justify-center rounded-lg border p-3 text-sm font-medium transition-all ${
                      unitSystem === "imperial"
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
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
                  <Label htmlFor="plotWidth" required>
                    Plot Width ({preferredUnit})
                  </Label>
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
                  <Label htmlFor="plotDepth" required>
                    Plot Depth / Length ({preferredUnit})
                  </Label>
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

              {errors.dimensions && (
                <p className="text-xs text-red-600">{errors.dimensions}</p>
              )}

              {/* Calculated Area Callout */}
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3.5 text-sm text-slate-600 border border-slate-200">
                <span className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-indigo-500" />
                  Estimated Plot Footprint:
                </span>
                <span className="font-semibold text-slate-900">
                  {formatArea(plotAreaSqMm, unitSystem)}
                </span>
              </div>

              {/* Floors Count */}
              <div>
                <Label>Number of Floors</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFloorsCount(f)}
                      className={`flex flex-col items-center justify-center rounded-lg border p-3 text-sm transition-all ${
                        floorsCount === f
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Home className="h-4 w-4 mb-1" />
                      {f === 1 ? "1 Level" : `${f} Levels`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Style & Priorities */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Style & Lifestyle Priorities</h2>
                <p className="mt-1 text-sm text-slate-500">
                  This guides the AI advisor when you discuss layout adjustments.
                </p>
              </div>

              {/* Style Grid */}
              <div>
                <Label>Architectural Style</Label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {styleOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStyle(opt.id)}
                      className={`flex flex-col text-left rounded-lg border p-3 transition-all ${
                        style === opt.id
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priorities Tag Selector */}
              <div>
                <Label>Design Priorities (Select all that matter)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {priorityTags.map((tag) => {
                    const selected = selectedPriorities.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePriority(tag)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            {step > 1 ? (
              <Button type="button" variant="outline" size="md" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => router.push("/dashboard")}
              >
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button type="button" size="md" onClick={handleNext}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="md"
                isLoading={isSubmitting}
                onClick={handleCreate}
              >
                <Sparkles className="h-4 w-4" />
                Initialize Project Canvas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
