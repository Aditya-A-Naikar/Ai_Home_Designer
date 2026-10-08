"use client";

import React, { useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { PROP_PRESETS, planAutonomousPlacement } from '@/core/ai/spatial-planner';
import { PropCategory, Prop } from '@/core/domain/types';
import { X, Sparkles, Tv, Armchair, BedDouble, Utensils, Briefcase, Check, Plus, CookingPot, Bath, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PropsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PropsCatalogModal({ isOpen, onClose }: PropsCatalogModalProps) {
  const { currentProject, addProp } = useProjectStore();
  const { selectSubElement } = useCanvasStore();

  const [activeCategory, setActiveCategory] = useState<PropCategory | 'all'>('all');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('tv_75');
  const [customColor, setCustomColor] = useState<string>('#0f172a');
  const [selectedTvInches, setSelectedTvInches] = useState<number>(75);
  const [selectedBedSize, setSelectedBedSize] = useState<string>('King');
  const [selectedSofaShape, setSelectedSofaShape] = useState<string>('l_shape');
  const [targetRoomId, setTargetRoomId] = useState<string>('auto');
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeFloor = currentProject?.floors.find(f => f.id === currentProject.activeFloorId);

  const categories: { id: PropCategory | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Props', icon: <Plus className="h-4 w-4" /> },
    { id: 'entertainment', label: 'TV & Cinema', icon: <Tv className="h-4 w-4" /> },
    { id: 'living', label: 'Sofas & Seating', icon: <Armchair className="h-4 w-4" /> },
    { id: 'bedroom', label: 'Beds & Closets', icon: <BedDouble className="h-4 w-4" /> },
    { id: 'dining', label: 'Dining', icon: <Utensils className="h-4 w-4" /> },
    { id: 'kitchen', label: 'Kitchen & Modular', icon: <CookingPot className="h-4 w-4" /> },
    { id: 'bathroom', label: 'Sanitary & Bath', icon: <Bath className="h-4 w-4" /> },
    { id: 'parking', label: 'Parking & Porch', icon: <Car className="h-4 w-4" /> },
    { id: 'office', label: 'Work & Study', icon: <Briefcase className="h-4 w-4" /> },
  ];

  const filteredPresetEntries = Object.entries(PROP_PRESETS).filter(([, preset]) => {
    if (activeCategory === 'all') return true;
    return preset.category === activeCategory;
  });

  const activePreset = PROP_PRESETS[selectedPresetKey] || PROP_PRESETS.tv_75;

  const colorSwatches = [
    { label: 'Charcoal Slate', value: '#0f172a' },
    { label: 'Navy Velvet', value: '#1e3a8a' },
    { label: 'Emerald Forest', value: '#064e3b' },
    { label: 'Warm Leather', value: '#78350f' },
    { label: 'Cream Linen', value: '#e2e8f0' },
    { label: 'Modern Indigo', value: '#4f46e5' },
    { label: 'Ruby Maroon', value: '#881337' },
  ];

  const handleAutoPlace = () => {
    if (!activeFloor) return;

    let keyToPlace = selectedPresetKey;
    if (activePreset.propType === 'tv') {
      keyToPlace = `tv_${selectedTvInches}`;
    }

    const overrides: Partial<Prop> = {
      color: customColor,
    };

    if (activePreset.propType === 'tv') {
      overrides.specifications = {
        screenSizeInches: selectedTvInches,
        mountType: 'wall',
        resolution: selectedTvInches >= 85 ? '8K UHD' : '4K HDR',
        soundbar: true,
      };
    } else if (activePreset.propType === 'sofa') {
      overrides.shape = selectedSofaShape as 'rectangular' | 'l_shape' | 'curved' | 'round';
    }

    const plan = planAutonomousPlacement(
      activeFloor,
      keyToPlace,
      targetRoomId === 'auto' ? undefined : targetRoomId,
      overrides
    );

    if (plan) {
      addProp(activeFloor.id, plan.prop);
      selectSubElement({ type: 'prop', id: plan.prop.id });
      setNotification(`AI successfully placed ${plan.prop.name} in ${plan.targetRoom.name}! ${plan.reasoning}`);
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification("No suitable room detected. Please create enclosed rooms first.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Accessories & Furniture Props Catalog</h2>
              <p className="text-xs text-slate-500">Autonomous AI Neufert placement & custom specification engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-indigo-600 text-white px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-inner">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              {notification}
            </span>
            <button onClick={() => setNotification(null)} className="text-indigo-200 hover:text-white">✕</button>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Category Sidebar */}
          <div className="w-52 border-r bg-slate-50/60 p-3 space-y-1 shrink-0 overflow-y-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === c.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            ))}
          </div>

          {/* Center: Prop Cards Grid */}
          <div className="flex-1 p-5 overflow-y-auto border-r">
            <div className="grid grid-cols-2 gap-3.5">
              {filteredPresetEntries.map(([key, preset]) => {
                const isSelected = selectedPresetKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedPresetKey(key);
                      setCustomColor(preset.defaultColor);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{preset.name}</h4>
                      <Badge variant="default" className="text-[10px] capitalize px-1.5 py-0">
                        {preset.category}
                      </Badge>
                    </div>

                    <div className="mt-2.5 text-[11px] text-slate-500 space-y-1">
                      <div>
                        Size: <span className="font-medium text-slate-800">{preset.dimensions.width} × {preset.dimensions.depth} mm</span>
                      </div>
                      <div>
                        Ergonomic Clearance: <span className="font-medium text-slate-800">{preset.clearance.front}mm front</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Customization & AI Placement Actions */}
          <div className="w-80 p-5 space-y-5 bg-white shrink-0 overflow-y-auto">
            <div>
              <h3 className="font-bold text-sm text-slate-900">{activePreset.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Customize specifications before placing</p>
            </div>

            {/* Room Destination Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target Enclosed Room</label>
              <select
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="auto">✨ Auto-Detect Best Room (AI)</option>
                {activeFloor?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* TV Screen Size Selector */}
            {activePreset.propType === 'tv' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Screen Diagonal</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[55, 65, 75, 85].map((inch) => (
                    <button
                      key={inch}
                      onClick={() => setSelectedTvInches(inch)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedTvInches === inch
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {inch}&quot;
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Optimal Neufert viewing distance: {(selectedTvInches * 0.038).toFixed(1)}m – {(selectedTvInches * 0.045).toFixed(1)}m
                </p>
              </div>
            )}

            {/* Bed Size Selector */}
            {activePreset.propType === 'bed' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Bed Size</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['King', 'Queen', 'Single'].map((bSize) => (
                    <button
                      key={bSize}
                      onClick={() => setSelectedBedSize(bSize)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedBedSize === bSize
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {bSize}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sofa Shape Selector */}
            {activePreset.propType === 'sofa' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Sectional Layout</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'rectangular', label: '3-Seater Straight' },
                    { id: 'l_shape', label: 'L-Shape Sectional' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSofaShape(s.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-colors ${
                        selectedSofaShape === s.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Swatch Customizer */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Material & Color Swatch</label>
              <div className="flex flex-wrap gap-2">
                {colorSwatches.map((swatch) => (
                  <button
                    key={swatch.value}
                    onClick={() => setCustomColor(swatch.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-all flex items-center justify-center ${
                      customColor === swatch.value
                        ? 'border-indigo-600 scale-110 shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.value }}
                    title={swatch.label}
                  >
                    {customColor === swatch.value && (
                      <Check className={`h-3.5 w-3.5 ${swatch.value === '#e2e8f0' ? 'text-slate-900' : 'text-white'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t">
              <Button
                onClick={handleAutoPlace}
                variant="primary"
                className="w-full gap-1.5 h-10 font-bold text-xs shadow-md shadow-indigo-600/20"
              >
                <Sparkles className="h-4 w-4" />
                <span>Auto-Place with AI</span>
              </Button>
              <p className="text-[10px] text-slate-400 text-center leading-tight">
                AI analyzes solid walls, room bounds, and door swings to position prop with zero overlap.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
