"use client";

import React, { useState, useMemo } from "react";
import { useProjectStore } from "@/store/project-store";
import { useCanvasStore } from "@/store/canvas-store";
import { PROP_PRESETS } from "@/core/ai/spatial-planner";
import { Prop, PropCategory } from "@/core/domain/types";
import { v4 as uuidv4 } from "uuid";
import { 
  Armchair, 
  Search, 
  Plus, 
  X
} from "lucide-react";

export function FurnitureCatalogDock() {
  const { currentProject, addProp } = useProjectStore();
  const { catalogDockOpen, setCatalogDockOpen, selectSubElement } = useCanvasStore();

  const [activeCategory, setActiveCategory] = useState<PropCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeFloor = currentProject?.floors.find(
    (f) => f.id === currentProject.activeFloorId
  ) || currentProject?.floors[0];

  const filteredItems = useMemo(() => {
    return Object.entries(PROP_PRESETS).filter(([, preset]) => {
      const matchesCategory =
        activeCategory === "all" || preset.category === activeCategory;
      const matchesSearch =
        searchQuery === "" ||
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.propType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!catalogDockOpen) return null;

  const handlePlaceProp = (presetKey: string) => {
    if (!activeFloor) return;
    const preset = PROP_PRESETS[presetKey];
    if (!preset) return;

    let placeX = 3000;
    let placeY = 3000;
    if (activeFloor.rooms.length > 0 && activeFloor.rooms[0].polygon.length > 0) {
      const p = activeFloor.rooms[0].polygon;
      placeX = p.reduce((acc, pt) => acc + pt.x, 0) / p.length;
      placeY = p.reduce((acc, pt) => acc + pt.y, 0) / p.length;
    }

    const newPropId = uuidv4();
    const newProp: Prop = {
      id: newPropId,
      floorId: activeFloor.id,
      name: preset.name,
      category: preset.category,
      propType: preset.propType,
      position: { x: Math.round(placeX), y: Math.round(placeY) },
      rotation: 0,
      elevationOffsetMm: 0,
      dimensions: {
        width: preset.dimensions.width,
        depth: preset.dimensions.depth,
        height: preset.dimensions.height || 800,
      },
      color: preset.defaultColor,
      finishColor: preset.defaultColor,
      shape: preset.shape,
    };

    addProp(activeFloor.id, newProp);
    selectSubElement({ type: "prop", id: newPropId });
  };

  const categories = [
    { id: "all" as const, label: "All" },
    { id: "living" as const, label: "Living" },
    { id: "bedroom" as const, label: "Bedroom" },
    { id: "kitchen" as const, label: "Kitchen" },
    { id: "bathroom" as const, label: "Bath" },
    { id: "entertainment" as const, label: "Media" },
    { id: "decor" as const, label: "Decor" },
  ];

  return (
    <div className="w-80 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col h-full shrink-0 select-none z-20 font-mono shadow-xl">
      {/* Header */}
      <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2">
          <Armchair className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Furniture & Decor
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setCatalogDockOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-900 transition-colors cursor-pointer"
          title="Close Catalog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category Pills */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer shrink-0 ${
              activeCategory === cat.id
                ? "bg-cyan-500 text-slate-950 shadow-xs"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/20 shrink-0">
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search furniture, fans, beds..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-sans"
          />
        </div>
      </div>

      {/* Drag & Drop Hint Banner */}
      <div className="px-3 py-1.5 bg-cyan-950/30 border-b border-cyan-900/30 text-[10px] text-cyan-300 flex items-center justify-between shrink-0">
        <span>💡 Drag cards directly onto 3D scene</span>
        <span className="text-cyan-400 font-bold">SNAP ACTIVE</span>
      </div>

      {/* Item Cards Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {filteredItems.map(([key, preset]) => (
            <div
              key={key}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({
                    type: "furniture-catalog-item",
                    presetKey: key,
                  })
                );
              }}
              onClick={() => handlePlaceProp(key)}
              className="border border-slate-800/90 hover:border-cyan-500 rounded-xl p-2.5 bg-slate-900/80 hover:bg-cyan-950/30 transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing shadow-xs"
              title={`Drag into 3D floor plan or click to place in room`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-600 shrink-0"
                    style={{ backgroundColor: preset.defaultColor }}
                  />
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">
                    {preset.category}
                  </span>
                </div>
                <h5 className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 font-sans">
                  {preset.name}
                </h5>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {preset.dimensions.width} × {preset.dimensions.depth} mm
                </p>
              </div>

              <div className="mt-2.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-cyan-300">
                <span>Place</span>
                <Plus className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No furniture matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
