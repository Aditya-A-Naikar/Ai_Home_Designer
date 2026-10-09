"use client";

import React from "react";
import { useCanvasStore } from "@/store/canvas-store";
import { useProjectStore } from "@/store/project-store";
import { 
  RefreshCw, 
  Eye, 
  Footprints, 
  Download, 
  Camera,
  Box
} from "lucide-react";

interface BottomFeatureStripProps {
  onOpenRenderStudio?: () => void;
  onOpenExportModal?: () => void;
  onOpenBoqModal?: () => void;
}

export function BottomFeatureStrip({
  onOpenRenderStudio,
  onOpenExportModal,
  onOpenBoqModal,
}: BottomFeatureStripProps) {
  const { 
    viewMode, 
    setViewMode, 
    walkthroughActive, 
    setWalkthroughActive,
    selectElement,
    selectSubElement
  } = useCanvasStore();

  const { currentProject, setActiveFloor } = useProjectStore();

  const activeFloor = currentProject?.floors.find(
    (f) => f.id === currentProject.activeFloorId
  ) || currentProject?.floors[0];

  const handleFocusRoom = (roomId: string) => {
    selectElement(roomId);
    selectSubElement({ type: "room", id: roomId });
  };

  return (
    <footer aria-label="Project sync and navigation bar" className="w-full bg-[#080d19] border-t border-slate-800/80 px-4 py-2 shrink-0 select-none z-20 text-xs">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto flex-wrap sm:flex-nowrap">
        
        {/* Feature 1: Real-Time 2D & 3D Sync Status */}
        <div className="flex items-center gap-2.5 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 shrink-0">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-[11px]">
              <RefreshCw className="h-3 w-3 text-cyan-400" />
              <span>2D & 3D Sync</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded">Live</span>
            </div>
            <span className="text-[9px] text-slate-400 leading-none mt-0.5">
              Instant parametric updates
            </span>
          </div>
        </div>

        {/* Feature 2: Quick Interior Views */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Eye className="h-3 w-3 text-cyan-400" />
            Rooms:
          </span>
          {activeFloor && activeFloor.rooms.length > 0 ? (
            activeFloor.rooms.slice(0, 5).map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => handleFocusRoom(room.id)}
                className="px-2 py-1 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer truncate max-w-[120px]"
                title={`Jump to ${room.name}`}
              >
                {room.name}
              </button>
            ))
          ) : (
            <span className="text-[10px] text-slate-400 italic">No rooms partitioned yet</span>
          )}
        </div>

        {/* Feature 3: Walkthrough & Viewport Mode Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setViewMode("2d");
              setWalkthroughActive(false);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === "2d"
                ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                : "bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span>2D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("3d");
              setWalkthroughActive(false);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === "3d" && !walkthroughActive
                ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-xs"
                : "bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Box className="h-3 w-3" />
            <span>3D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("3d");
              setWalkthroughActive(!walkthroughActive);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
              walkthroughActive
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs shadow-amber-500/20"
                : "bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
            title="First-Person Walkthrough (WASD / Mouse Look)"
          >
            <Footprints className="h-3 w-3" />
            <span>Walk</span>
          </button>
        </div>

        {/* Feature 4: Floor Level Quick Switcher */}
        {currentProject && currentProject.floors.length > 1 && (
          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">Lvl:</span>
            {currentProject.floors.map((fl) => (
              <button
                key={fl.id}
                type="button"
                onClick={() => setActiveFloor(fl.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                  fl.id === currentProject.activeFloorId
                    ? "bg-indigo-600 border-indigo-400 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {fl.level === 0 ? "GF" : `L${fl.level}`}
              </button>
            ))}
          </div>
        )}

        {/* Feature 5: Renders, Export & BOQ Actions */}
        <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-800 pl-3">
          {onOpenRenderStudio && (
            <button
              type="button"
              onClick={onOpenRenderStudio}
              className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Open Render Studio"
            >
              <Camera className="h-3 w-3 text-cyan-400" />
              <span className="hidden md:inline">Render</span>
            </button>
          )}

          {onOpenBoqModal && (
            <button
              type="button"
              onClick={onOpenBoqModal}
              className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Bill of Quantities / Cost Estimation"
            >
              <span className="text-amber-400 font-mono text-[10px] font-bold">$</span>
              <span className="hidden md:inline">BOQ</span>
            </button>
          )}

          {onOpenExportModal && (
            <button
              type="button"
              onClick={onOpenExportModal}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Export 2D CAD Blueprint or 3D Models"
            >
              <Download className="h-3 w-3" />
              <span>Export</span>
            </button>
          )}
        </div>

      </div>
    </footer>
  );
}
