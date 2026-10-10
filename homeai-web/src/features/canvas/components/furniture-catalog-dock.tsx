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
  const { activeDrawer, closeDrawer, selectSubElement, viewMode, activePlacementPreset, setActivePlacementPreset } = useCanvasStore();

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

  if (activeDrawer !== 'catalog') return null;

  const handlePlaceProp = (presetKey: string) => {
    if (!activeFloor) return;
    const preset = PROP_PRESETS[presetKey];
    if (!preset) return;

    if (viewMode === '3d') {
      if (activePlacementPreset === presetKey) {
        setActivePlacementPreset(null);
      } else {
        setActivePlacementPreset(presetKey);
      }
      return;
    }

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
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none z-20 shadow-sm">
      {/* Header */}
      <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-600/10 text-indigo-600 flex items-center justify-center">
            <Armchair className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Furniture & Decor
          </h3>
        </div>
        <button
          type="button"
          onClick={() => closeDrawer()}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
          title="Close Catalog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category Pills */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
              activeCategory === cat.id
                ? "bg-indigo-600 text-white shadow-xs font-semibold"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="p-3 border-b border-slate-100 bg-white shrink-0">
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search furniture, fans, beds..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Drag & Drop Hint Banner */}
      <div className="px-3 py-1.5 bg-indigo-50/70 border-b border-indigo-100 text-[11px] text-indigo-700 flex items-center justify-between shrink-0 font-medium">
        <span>💡 Click to place or drag onto canvas</span>
        <span className="text-indigo-600 font-semibold text-[10px] uppercase">Snap Active</span>
      </div>

      {/* Item Cards Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {filteredItems.map(([key, preset]) => {
            const is3DActive = viewMode === '3d' && activePlacementPreset === key;
            return (
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
                  className={`border rounded-xl p-2.5 transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing shadow-xs hover:shadow-sm ${
                    is3DActive
                      ? "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/30"
                      : "border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-white"
                  }`}
                  title={viewMode === '3d' ? "Click to place in 3D (with magnetic wall alignment)" : "Drag into floor plan or click to place"}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: preset.defaultColor }}
                      />
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider font-medium">
                        {preset.category}
                      </span>
                    </div>
                    <h5 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {preset.name}
                    </h5>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {preset.dimensions.width} × {preset.dimensions.depth} mm
                    </p>
                  </div>

                  <div className={`mt-2.5 pt-1.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-medium ${
                    is3DActive ? "text-indigo-700 font-bold" : "text-slate-500 group-hover:text-indigo-600"
                  }`}>
                    <span>{is3DActive ? "Placing in 3D..." : viewMode === '3d' ? "Place in 3D" : "Place"}</span>
                    <Plus className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            No furniture matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
