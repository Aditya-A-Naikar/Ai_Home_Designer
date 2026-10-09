"use client";

import React, { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { useCanvasStore } from "@/store/canvas-store";
import { WALL_FINISHES, FloorFinishType, WallFinishType } from "@/core/geometry/pbr-materials";
import { 
  Palette, 
  Check, 
  X
} from "lucide-react";

type MaterialTab = "walls" | "floor" | "wood" | "fabrics" | "railings";

export function MaterialsColorsDock() {
  const { 
    currentProject, 
    updateWallFinishBulk, 
    updateFloorFinishBulk,
    updateWallFinish
  } = useProjectStore();

  const { 
    materialsDockOpen, 
    setMaterialsDockOpen, 
    selectedSubElement 
  } = useCanvasStore();

  const [activeTab, setActiveTab] = useState<MaterialTab>("walls");
  const [notification, setNotification] = useState<string | null>(null);

  if (!materialsDockOpen || !currentProject) return null;

  const activeFloor = currentProject.floors.find(
    (f) => f.id === currentProject.activeFloorId
  ) || currentProject.floors[0];

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleApplyWallFinish = (finishKey: WallFinishType, hexColor?: string) => {
    if (!activeFloor) return;
    if (selectedSubElement && selectedSubElement.type === "wall") {
      updateWallFinish(activeFloor.id, selectedSubElement.id, finishKey, hexColor);
      showNotification(`Updated wall finish to ${finishKey.replace(/_/g, " ")}.`);
    } else {
      updateWallFinishBulk(activeFloor.id, "all", undefined, finishKey, hexColor);
      showNotification(`Applied ${finishKey.replace(/_/g, " ")} to all walls on floor.`);
    }
  };

  const handleApplyFloorFinish = (finishKey: FloorFinishType) => {
    if (!activeFloor) return;
    updateFloorFinishBulk(activeFloor.id, finishKey);
    showNotification(`Applied ${finishKey.replace(/_/g, " ")} flooring across rooms.`);
  };

  const wallColors = [
    { label: "Pure Chalk", hex: "#ffffff", finish: "white_plaster" as WallFinishType },
    { label: "Nordic Greige", hex: "#e7e5e4", finish: "warm_greige" as WallFinishType },
    { label: "Warm Beige", hex: "#f5f5f4", finish: "warm_greige" as WallFinishType },
    { label: "Sage Earth", hex: "#dcfce7", finish: "white_plaster" as WallFinishType },
    { label: "Muted Ocean", hex: "#e0f2fe", finish: "white_plaster" as WallFinishType },
    { label: "Exposed Brick", hex: "#9a3412", finish: "exposed_brick" as WallFinishType },
    { label: "Charcoal Slate", hex: "#1e293b", finish: "charcoal_slate" as WallFinishType },
    { label: "Anthracite", hex: "#0f172a", finish: "charcoal_slate" as WallFinishType },
  ];

  const flooringOptions: { key: FloorFinishType; name: string; desc: string; previewColor: string }[] = [
    { key: "italian_marble", name: "Calacatta Gold Marble", desc: "Bookmatched white Italian marble with warm gold veining", previewColor: "#f8fafc" },
    { key: "teak_hardwood", name: "Golden Teak Hardwood", desc: "Micro-beveled wide plank timber with natural satin sheen", previewColor: "#b45309" },
    { key: "polished_concrete", name: "Honed Architectural Concrete", desc: "Monolithic micro-topping screed for contemporary spaces", previewColor: "#64748b" },
    { key: "terrazzo", name: "Venetian Cast Terrazzo", desc: "River-pebble aggregate terrazzo for Mediterranean light", previewColor: "#cbd5e1" },
    { key: "slate_ceramic_tile", name: "Slate Ceramic Tile", desc: "Deep charcoal stone-look tile with subtle crystalline grain", previewColor: "#1e293b" },
  ];

  const sofaFabrics = [
    { name: "Emerald Velvet", color: "#166534", desc: "Italian high-density crushed velvet" },
    { name: "Cognac Leather", color: "#9a3412", desc: "Full-grain aniline saddle leather" },
    { name: "Belgian Sand Linen", color: "#d6d3d1", desc: "Breathable natural textured linen" },
    { name: "Charcoal Chenille", color: "#334155", desc: "Heavy architectural woven chenille" },
    { name: "Oatmeal Bouclé", color: "#f5f5f4", desc: "Cozy nubby wool bouclé upholstery" },
  ];

  const railingStyles = [
    { name: "Frameless Tempered Glass", desc: "12mm acoustic laminated glass with recessed stainless base shoe" },
    { name: "Anodized Black Slat", desc: "Minimalist 20x40mm vertical aluminum profile balustrade" },
    { name: "Stainless Steel Wire", desc: "Marine-grade 316 tension cable with brushed square posts" },
    { name: "Hardwood & Steel Hybrid", desc: "Teak top-rail with laser-cut charcoal infill panels" },
    { name: "Classic Wrought Iron", desc: "Heritage cast iron spindles with curved handrail profile" },
  ];

  return (
    <div className="w-84 bg-[#0a0f1d] border-l border-slate-800/80 flex flex-col h-full shrink-0 select-none z-20 font-mono shadow-2xl">
      {/* Header */}
      <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Materials & Finishes
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setMaterialsDockOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-900 transition-colors cursor-pointer"
          title="Close Materials Dock"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {[
          { id: "walls" as const, label: "Walls" },
          { id: "floor" as const, label: "Floor" },
          { id: "fabrics" as const, label: "Fabrics" },
          { id: "wood" as const, label: "Cabinetry" },
          { id: "railings" as const, label: "Railings" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? "bg-cyan-500 text-slate-950 shadow-xs"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-[10px] flex items-center gap-1.5 animate-in fade-in shrink-0">
          <Check className="h-3 w-3 text-emerald-400 shrink-0" />
          <span className="truncate">{notification}</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* WALLS TAB */}
        {activeTab === "walls" && (
          <div className="space-y-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-2 font-bold">
                Wall Colors & Textures
              </span>
              <div className="grid grid-cols-2 gap-2">
                {wallColors.map((wc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyWallFinish(wc.finish, wc.hex)}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500 text-left transition-all flex items-center gap-2 group cursor-pointer"
                  >
                    <span
                      className="h-5 w-5 rounded-md border border-slate-700 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: wc.hex }}
                    />
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-white block truncate font-sans">
                        {wc.label}
                      </span>
                      <span className="text-[9px] text-slate-500 block truncate">
                        {wc.hex}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block mb-2 font-bold">
                Architectural Wall Presets
              </span>
              <div className="space-y-1.5">
                {Object.entries(WALL_FINISHES).map(([key, spec]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleApplyWallFinish(key as WallFinishType)}
                    className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-[11px] font-bold text-white block group-hover:text-cyan-300 font-sans">
                        {spec.name}
                      </span>
                      <span className="text-[9px] text-slate-500 block line-clamp-1">
                        {spec.description}
                      </span>
                    </div>
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0"
                      style={{ backgroundColor: '#' + spec.colorHex.toString(16).padStart(6, '0') }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FLOOR TAB */}
        {activeTab === "floor" && (
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
              PBR Flooring Surfaces
            </span>
            <div className="space-y-2">
              {flooringOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleApplyFloorFinish(opt.key)}
                  className="w-full p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500 text-left transition-all flex items-start justify-between group cursor-pointer"
                >
                  <div className="pr-2">
                    <span className="text-[11px] font-bold text-white block group-hover:text-cyan-300 font-sans">
                      {opt.name}
                    </span>
                    <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">
                      {opt.desc}
                    </span>
                  </div>
                  <span
                    className="h-5 w-5 rounded-md border border-slate-700 shrink-0 mt-0.5"
                    style={{ backgroundColor: opt.previewColor }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FABRICS TAB */}
        {activeTab === "fabrics" && (
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
              Upholstery & Fabrics
            </span>
            <div className="space-y-2">
              {sofaFabrics.map((fab, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-5 w-5 rounded-md border border-slate-700 shrink-0"
                      style={{ backgroundColor: fab.color }}
                    />
                    <div>
                      <span className="text-[11px] font-bold text-white block font-sans">
                        {fab.name}
                      </span>
                      <span className="text-[9px] text-slate-500 block">
                        {fab.desc}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RAILINGS TAB */}
        {activeTab === "railings" && (
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
              Balcony & Stair Railings
            </span>
            <div className="space-y-2">
              {railingStyles.map((r, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 transition-colors"
                >
                  <span className="text-[11px] font-bold text-white block font-sans">
                    {r.name}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">
                    {r.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CABINETRY TAB */}
        {activeTab === "wood" && (
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
              Cabinetry & Modular Storage
            </span>
            <div className="space-y-2">
              {[
                { name: "Fluted American Walnut", desc: "Vertical slat solid timber with matte lacquer" },
                { name: "Smoked Grey Oak", desc: "Brushed architectural wire grain veneer" },
                { name: "Ultra-Matte Anthracite", desc: "Anti-fingerprint thermal laminate" },
                { name: "Warm Nordic Birch", desc: "Natural blonde birch plywood core with exposed edge" },
              ].map((wood, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <span className="text-[11px] font-bold text-white block font-sans">
                    {wood.name}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">
                    {wood.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
