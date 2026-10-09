"use client";

import React, { useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { ARCHITECTURAL_DESIGN_PRESETS, DesignPresetSpec } from '@/core/geometry/design-presets';
import { FLOOR_FINISHES, WALL_FINISHES, FloorFinishType, WallFinishType } from '@/core/geometry/pbr-materials';
import { PROP_PRESETS } from '@/core/ai/spatial-planner';
import { Prop, PropCategory } from '@/core/domain/types';
import { v4 as uuidv4 } from 'uuid';
import { 
  Sparkles, 
  Plus, 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Armchair,
  Tv,
  BedDouble,
  Utensils,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface Selected3DEntity {
  type: 'prop' | 'wall' | 'room';
  id: string;
  floorId: string;
  name?: string;
  propType?: string;
  rotation?: number;
  position?: { x: number; y: number };
  floorFinishId?: string;
  wallFinishId?: string;
  colorHex?: string;
}

interface Viewport3DCustomizerProps {
  selectedEntity: Selected3DEntity | null;
  onCloseSelection: () => void;
  onPresetApplied?: (presetName: string) => void;
}

export function Viewport3DCustomizer({
  selectedEntity,
  onCloseSelection,
  onPresetApplied,
}: Viewport3DCustomizerProps) {
  const { 
    currentProject, 
    updateWallFinish, 
    updateWallFinishBulk, 
    updateRoomFloorFinish, 
    updateFloorFinishBulk,
    updatePropCustomization,
    deleteProp,
    addProp,
    applyDesignPreset 
  } = useProjectStore();

  const { selectSubElement } = useCanvasStore();

  const [presetsDrawerOpen, setPresetsDrawerOpen] = useState(false);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false);
  const [activeCatalogCategory, setActiveCatalogCategory] = useState<PropCategory | 'all'>('living');
  const [activePresetNotification, setActivePresetNotification] = useState<string | null>(null);

  if (!currentProject) return null;

  const activeFloor = currentProject.floors.find(f => f.id === currentProject.activeFloorId) || currentProject.floors[0];

  // Handler to apply architectural preset
  const handleApplyPreset = (preset: DesignPresetSpec) => {
    applyDesignPreset(preset.id);
    setActivePresetNotification(`Applied "${preset.name}" preset across all spaces.`);
    if (onPresetApplied) onPresetApplied(preset.name);
    setTimeout(() => setActivePresetNotification(null), 3500);
    setPresetsDrawerOpen(false);
  };

  // Handler to add prop from catalog directly into 3D view
  const handleAddPropFromCatalog = (presetKey: string) => {
    if (!activeFloor) return;
    const preset = PROP_PRESETS[presetKey];
    if (!preset) return;

    // Calculate placement center (either in first room or floor bounds)
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
      dimensions: {
        width: preset.dimensions.width,
        depth: preset.dimensions.depth,
        height: preset.dimensions.height || 800,
      },
      color: preset.defaultColor,
      finishColor: preset.defaultColor,
      shape: preset.shape,
      specifications: { ...preset.specifications },
    };

    addProp(activeFloor.id, newProp);
    selectSubElement({ type: 'prop', id: newPropId });
    setCatalogDrawerOpen(false);
  };

  // Duplicate selected prop
  const handleDuplicateProp = () => {
    if (!selectedEntity || selectedEntity.type !== 'prop' || !activeFloor) return;
    const prop = activeFloor.props?.find(p => p.id === selectedEntity.id);
    if (!prop) return;

    const clonedId = uuidv4();
    const clonedProp: Prop = {
      ...JSON.parse(JSON.stringify(prop)),
      id: clonedId,
      name: `${prop.name} (Copy)`,
      position: { x: prop.position.x + 500, y: prop.position.y + 500 },
    };

    addProp(activeFloor.id, clonedProp);
    selectSubElement({ type: 'prop', id: clonedId });
  };

  // Rotate prop
  const handleRotateProp = (deltaDeg: number) => {
    if (!selectedEntity || selectedEntity.type !== 'prop' || !activeFloor) return;
    const prop = activeFloor.props?.find(p => p.id === selectedEntity.id);
    if (!prop) return;

    const newRot = ((prop.rotation || 0) + deltaDeg + 360) % 360;
    updatePropCustomization(activeFloor.id, prop.id, { rotation: newRot });
  };

  // Nudge prop in 2D plane (mm)
  const handleNudgeProp = (dx: number, dy: number) => {
    if (!selectedEntity || selectedEntity.type !== 'prop' || !activeFloor) return;
    const prop = activeFloor.props?.find(p => p.id === selectedEntity.id);
    if (!prop) return;

    updatePropCustomization(activeFloor.id, prop.id, {
      position: { x: prop.position.x + dx, y: prop.position.y + dy }
    });
  };

  // Delete selected prop
  const handleDeleteProp = () => {
    if (!selectedEntity || selectedEntity.type !== 'prop' || !activeFloor) return;
    deleteProp(activeFloor.id, selectedEntity.id);
    onCloseSelection();
  };

  // Quick prop colors
  const propColors = [
    { label: 'Charcoal Slate', value: '#1e293b' },
    { label: 'Navy Velvet', value: '#1e3a8a' },
    { label: 'Emerald Forest', value: '#064e3b' },
    { label: 'Cognac Leather', value: '#78350f' },
    { label: 'Cream Bouclé', value: '#e2e8f0' },
    { label: 'Warm Teak', value: '#b45309' },
  ];

  // Modern architectural wall colors
  const wallColors = [
    { label: 'Chalk White', value: '#ffffff' },
    { label: 'Warm Greige', value: '#f5f5f4' },
    { label: 'Muted Concrete', value: '#e2e8f0' },
    { label: 'Sage Mineral', value: '#d1fae5' },
    { label: 'Terracotta Clay', value: '#ffedd5' },
    { label: 'Anthracite', value: '#1e293b' },
  ];

  return (
    <>
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
        {/* Design Presets Dropdown Trigger */}
        <button
          onClick={() => setPresetsDrawerOpen(true)}
          className="h-9 px-3 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
          title="Apply Coordinated Architectural Presets"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          <span>Design Presets</span>
        </button>

        {/* 3D Furniture Catalog Trigger */}
        <button
          onClick={() => setCatalogDrawerOpen(true)}
          className="h-9 px-3 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
          title="Add Furniture & Architectural Props"
        >
          <Armchair className="h-3.5 w-3.5 text-indigo-600" />
          <span>Add Furniture</span>
        </button>
      </div>

      {/* Preset Applied Notification Toast */}
      {activePresetNotification && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{activePresetNotification}</span>
        </div>
      )}

      {/* Keyboard Shortcuts Hint Bar */}
      {selectedEntity && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 backdrop-blur-md border border-slate-700 text-slate-300 px-3.5 py-1.5 rounded-full text-[11px] font-mono shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <span className="text-cyan-400 font-bold uppercase">{selectedEntity.type} Selected</span>
          <span className="text-slate-600">•</span>
          <span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-white font-bold">R</kbd> Rotate</span>
          <span className="text-slate-600">•</span>
          <span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-white font-bold">Del</kbd> Remove</span>
          <span className="text-slate-600">•</span>
          <span><kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-white font-bold">Esc</kbd> Deselect</span>
        </div>
      )}

      {/* FLOATING CONTEXTUAL 3D PROPERTIES PANEL (Appears on click in 3D) */}
      {selectedEntity && (
        <div className="absolute top-16 right-4 z-30 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-3 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                selectedEntity.type === 'prop' ? 'bg-indigo-600' :
                selectedEntity.type === 'wall' ? 'bg-amber-600' : 'bg-emerald-600'
              }`} />
              <div>
                <h3 className="text-xs font-bold text-slate-900 capitalize">
                  {selectedEntity.type === 'prop' ? (selectedEntity.name || 'Furniture Item') :
                   selectedEntity.type === 'wall' ? 'Structural Wall' : 'Room Floor Slab'}
                </h3>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  3D Entity Inspector
                </span>
              </div>
            </div>
            <button
              onClick={onCloseSelection}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* === PROP (FURNITURE) INSPECTOR === */}
            {selectedEntity.type === 'prop' && (
              <>
                {/* Fast Rotation Buttons */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Rotation & Orientation
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => handleRotateProp(-90)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Rotate 90 degrees CCW"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>-90°</span>
                    </button>
                    <button
                      onClick={() => handleRotateProp(-45)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Rotate 45 degrees CCW"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>-45°</span>
                    </button>
                    <button
                      onClick={() => handleRotateProp(45)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Rotate 45 degrees CW"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>+45°</span>
                    </button>
                    <button
                      onClick={() => handleRotateProp(90)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      title="Rotate 90 degrees CW"
                    >
                      <RotateCw className="h-3 w-3" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>

                {/* Position Nudge Controls */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Position Nudge (Floor Plane)
                  </label>
                  <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <button
                      onClick={() => handleNudgeProp(-200, 0)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                      title="Move West 200mm"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleNudgeProp(0, -200)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                        title="Move North 200mm"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleNudgeProp(0, 200)}
                        className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                        title="Move South 200mm"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleNudgeProp(200, 0)}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                      title="Move East 200mm"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Upholstery & Finish Color */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Finish & Upholstery Material
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {propColors.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          if (activeFloor) {
                            updatePropCustomization(activeFloor.id, selectedEntity.id, { color: c.value });
                          }
                        }}
                        className="h-8 rounded-lg border border-slate-300 shadow-xs hover:scale-110 transition-transform cursor-pointer relative"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Duplicate / Delete Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDuplicateProp}
                    className="flex-1 text-xs text-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Duplicate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteProp}
                    className="flex-1 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </Button>
                </div>
              </>
            )}

            {/* === ROOM (FLOOR SLAB) INSPECTOR === */}
            {selectedEntity.type === 'room' && (
              <>
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    {selectedEntity.name || 'Selected Room'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select a procedural architectural PBR finish for this room floor.
                  </p>
                </div>

                {/* Floor Finish Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    PBR Floor Finishes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(FLOOR_FINISHES) as FloorFinishType[]).map((finKey) => {
                      const fin = FLOOR_FINISHES[finKey];
                      return (
                        <button
                          key={finKey}
                          onClick={() => {
                            if (activeFloor) {
                              updateRoomFloorFinish(activeFloor.id, selectedEntity.id, finKey);
                            }
                          }}
                          className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 text-left bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" 
                              style={{ backgroundColor: '#' + fin.colorHex.toString(16).padStart(6, '0') }} 
                            />
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              {fin.name}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 capitalize">
                            Rough: {fin.roughness}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bulk Apply to Entire Floor */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (activeFloor && selectedEntity.floorFinishId) {
                        updateFloorFinishBulk(activeFloor.id, selectedEntity.floorFinishId as FloorFinishType);
                        setActivePresetNotification("Applied floor finish to all rooms on this floor.");
                        setTimeout(() => setActivePresetNotification(null), 3000);
                      }
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Apply Current Finish to Entire Floor
                  </button>
                </div>
              </>
            )}

            {/* === WALL INSPECTOR === */}
            {selectedEntity.type === 'wall' && (
              <>
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Wall Segment Finish
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Customize architectural masonry, mineral plaster, or timber panelling.
                  </p>
                </div>

                {/* Wall Finishes */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Wall Material Textures
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(WALL_FINISHES) as WallFinishType[]).map((wKey) => {
                      const wFin = WALL_FINISHES[wKey];
                      return (
                        <button
                          key={wKey}
                          onClick={() => {
                            if (activeFloor) {
                              updateWallFinish(activeFloor.id, selectedEntity.id, wKey);
                            }
                          }}
                          className="p-2 rounded-xl border border-slate-200 hover:border-indigo-500 text-left bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" 
                              style={{ backgroundColor: '#' + wFin.colorHex.toString(16).padStart(6, '0') }} 
                            />
                            <span className="text-[11px] font-bold text-slate-800 truncate">
                              {wFin.name}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 capitalize">
                            PBR Texture
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Designer Colors */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                    Architectural Tint
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {wallColors.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          if (activeFloor) {
                            updateWallFinish(activeFloor.id, selectedEntity.id, undefined, c.value);
                          }
                        }}
                        className="h-8 rounded-lg border border-slate-300 shadow-xs hover:scale-110 transition-transform cursor-pointer relative"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Bulk Apply to All Walls */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (activeFloor && selectedEntity.wallFinishId) {
                        updateWallFinishBulk(activeFloor.id, 'all', undefined, selectedEntity.wallFinishId as WallFinishType);
                        setActivePresetNotification("Applied wall finish across all walls on this floor.");
                        setTimeout(() => setActivePresetNotification(null), 3000);
                      }
                    }}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Apply Finish to ALL Walls on this Floor
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* DESIGN PRESETS DRAWER */}
      {presetsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Coordinated Architectural Design Presets</h2>
                  <p className="text-xs text-slate-500">
                    Transform the entire residence in one click with harmonious materials, lighting, and palette.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPresetsDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(ARCHITECTURAL_DESIGN_PRESETS).map((preset) => (
                  <div
                    key={preset.id}
                    className="border border-slate-200 hover:border-indigo-500 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {preset.name}
                        </h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {preset.furnitureStyle}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-950 font-medium mb-1">
                        {preset.tagline}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                        {preset.description}
                      </p>

                      {/* Material Swatch Preview Badges */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {preset.recommendedMaterials.map((mat, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 font-medium"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Apply {preset.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D FURNITURE & PROPS CATALOG DRAWER */}
      {catalogDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Armchair className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">3D Furniture & Accessories Catalog</h2>
                  <p className="text-xs text-slate-500">
                    Click any item to insert it directly into your 3D residence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCatalogDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex border-b border-slate-100 px-6 py-2.5 bg-slate-50/50 gap-2 overflow-x-auto">
              {[
                { id: 'living', label: 'Living Room', icon: <Armchair className="h-3.5 w-3.5" /> },
                { id: 'entertainment', label: 'TV & Media', icon: <Tv className="h-3.5 w-3.5" /> },
                { id: 'bedroom', label: 'Bedroom & Beds', icon: <BedDouble className="h-3.5 w-3.5" /> },
                { id: 'dining', label: 'Dining', icon: <Utensils className="h-3.5 w-3.5" /> },
                { id: 'kitchen', label: 'Kitchen', icon: <Utensils className="h-3.5 w-3.5" /> },
                { id: 'all', label: 'All Items', icon: <Plus className="h-3.5 w-3.5" /> },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatalogCategory(cat.id as PropCategory | 'all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                    activeCatalogCategory === cat.id 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Items Grid */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(PROP_PRESETS)
                  .filter(([, preset]) => activeCatalogCategory === 'all' || preset.category === activeCatalogCategory)
                  .map(([key, preset]) => (
                    <div
                      key={key}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: 'furniture-catalog-item',
                          presetKey: key,
                        }));
                      }}
                      className="border border-slate-200 hover:border-indigo-500 rounded-xl p-3 bg-white hover:bg-indigo-50/20 transition-all flex flex-col justify-between group cursor-grab active:cursor-grabbing shadow-xs"
                      onClick={() => handleAddPropFromCatalog(key)}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span 
                            className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" 
                            style={{ backgroundColor: preset.defaultColor }} 
                          />
                          <span className="text-[10px] text-slate-400 capitalize">
                            {preset.propType} • Drag to Place
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {preset.name}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {preset.dimensions.width} × {preset.dimensions.depth} mm
                        </p>
                      </div>

                      <button
                        className="mt-3 w-full py-1.5 bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Place or Drag in 3D</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM 3D FURNITURE QUICK-SHELF & DIRECT DRAG DOCK */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-xl text-xs font-mono pointer-events-auto">
        <span className="text-[10px] text-slate-400 uppercase font-bold px-1.5">
          3D Place:
        </span>
        {[
          { key: 'sofa_3_seater', label: 'Sofa', icon: <Armchair className="h-3 w-3" /> },
          { key: 'bed_king', label: 'Bed', icon: <BedDouble className="h-3 w-3" /> },
          { key: 'dining_table_6p', label: 'Dining', icon: <Utensils className="h-3 w-3" /> },
          { key: 'tv_75_inch', label: 'TV', icon: <Tv className="h-3 w-3" /> },
        ].map((item) => (
          <button
            key={item.key}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'furniture-catalog-item',
                presetKey: item.key,
              }));
            }}
            onClick={() => handleAddPropFromCatalog(item.key)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-800 hover:border-indigo-500 transition-colors cursor-grab active:cursor-grabbing flex items-center gap-1 font-semibold text-[11px]"
            title={`Click or Drag ${item.label} directly onto 3D floor plan`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setCatalogDrawerOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="h-3 w-3" />
          <span>More</span>
        </button>
      </div>
    </>
  );
}
