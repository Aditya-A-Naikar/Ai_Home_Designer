"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/store/canvas-store";
import { useProjectStore } from "@/store/project-store";
import { 
  Sparkles, 
  LayoutGrid, 
  CheckCircle2, 
  Box, 
  Palette, 
  Footprints, 
  Download,
  ChevronRight
} from "lucide-react";

export interface JourneyStep {
  id: number;
  title: string;
  tagline: string;
  icon: React.ReactNode;
}

export const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 1,
    title: "Start & Requirements",
    tagline: "Tell your requirements to AI or fill the form",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: 2,
    title: "2D Floor Plan",
    tagline: "AI creates accurate 2D plan with dimensions",
    icon: <LayoutGrid className="h-3.5 w-3.5" />,
  },
  {
    id: 3,
    title: "Confirm & Edit",
    tagline: "Edit rooms, dimensions, doors, windows, stairs",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  {
    id: 4,
    title: "3D Generation",
    tagline: "Convert 2D to realistic 3D instantly",
    icon: <Box className="h-3.5 w-3.5" />,
  },
  {
    id: 5,
    title: "Customize Everything",
    tagline: "Change colors, materials, furniture, fittings",
    icon: <Palette className="h-3.5 w-3.5" />,
  },
  {
    id: 6,
    title: "Walkthrough",
    tagline: "Explore in 3D, walk, use stairs, experience real space",
    icon: <Footprints className="h-3.5 w-3.5" />,
  },
  {
    id: 7,
    title: "Save, Render & Export",
    tagline: "High quality renders, 360° tour, VR, PDF, share",
    icon: <Download className="h-3.5 w-3.5" />,
  },
];

interface UserJourneyStepperProps {
  onOpenConfirmModal?: () => void;
  onOpenRenderStudio?: () => void;
  onOpenExportModal?: () => void;
}

export function UserJourneyStepper({
  onOpenConfirmModal,
  onOpenRenderStudio,
}: UserJourneyStepperProps) {
  const router = useRouter();
  const { 
    viewMode, 
    setViewMode, 
    activeStage, 
    setActiveStage,
    setCatalogDockOpen,
    setMaterialsDockOpen,
    setWalkthroughActive
  } = useCanvasStore();

  const { currentProject } = useProjectStore();

  const handleStepClick = (stepId: number) => {
    setActiveStage(stepId);

    switch (stepId) {
      case 1:
        router.push("/projects/new");
        break;
      case 2:
        setViewMode("2d");
        setWalkthroughActive(false);
        break;
      case 3:
        if (onOpenConfirmModal) onOpenConfirmModal();
        break;
      case 4:
        setViewMode("3d");
        setWalkthroughActive(false);
        break;
      case 5:
        setViewMode("3d");
        setWalkthroughActive(false);
        setCatalogDockOpen(true);
        setMaterialsDockOpen(true);
        break;
      case 6:
        setViewMode("3d");
        setWalkthroughActive(true);
        break;
      case 7:
        if (onOpenRenderStudio) onOpenRenderStudio();
        break;
    }
  };

  // Determine current active step dynamically if not explicitly overridden
  const effectiveStage = (() => {
    if (activeStage) return activeStage;
    if (viewMode === "2d") return 2;
    if (currentProject?.floorPlanStatus === "confirmed") return 5;
    return 4;
  })();

  return (
    <div className="w-full bg-[#0a0f1d] border-b border-slate-800/80 px-4 py-2 shrink-0 select-none overflow-x-auto font-mono scrollbar-none shadow-md">
      <div className="flex items-center justify-between min-w-[920px] max-w-7xl mx-auto gap-1">
        {JOURNEY_STEPS.map((step, idx) => {
          const isActive = effectiveStage === step.id;
          const isPassed = effectiveStage > step.id;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
                  isActive
                    ? "bg-cyan-950/80 border border-cyan-500/80 text-cyan-300 shadow-sm shadow-cyan-950/50"
                    : isPassed
                    ? "bg-slate-900/50 hover:bg-slate-800/70 border border-slate-800 text-slate-300"
                    : "hover:bg-slate-900/40 text-slate-500 border border-transparent"
                }`}
              >
                {/* Step Number Badge */}
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                    isActive
                      ? "bg-cyan-400 text-slate-950 shadow-xs shadow-cyan-400/50"
                      : isPassed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  {isPassed ? "✓" : step.id}
                </div>

                {/* Title & Microcopy */}
                <div className="min-w-0 pr-1">
                  <div
                    className={`text-[11px] font-bold tracking-tight truncate leading-tight ${
                      isActive
                        ? "text-white"
                        : isPassed
                        ? "text-slate-200"
                        : "text-slate-400 group-hover:text-slate-300"
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate hidden xl:block max-w-[140px] leading-tight mt-0.5">
                    {step.tagline}
                  </div>
                </div>
              </button>

              {idx < JOURNEY_STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 text-slate-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
