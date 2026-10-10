"use client";

import React, { useState } from 'react';
import { useCanvasStore, ToolType } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { FloorManager } from './floor-manager';
import { PropsCatalogModal } from './props-catalog-modal';
import { wallLength } from '@/core/geometry/wall-utils';
import { polygonArea, polygonPerimeter, ROOM_TYPE_PRESETS } from '@/core/geometry/room-utils';
import { Door, DoorType, WindowType, StairType, WallType } from '@/core/domain/types';
import { 
  Trash2, 
  DoorOpen, 
  AppWindow, 
  Square, 
  Hammer, 
  Info, 
  Armchair, 
  RotateCw, 
  RotateCcw,
  ChevronLeft,
  MousePointer2, 
  Move, 
  Sparkles 
} from 'lucide-react';

export function PropertiesPanel() {
  const { 
    selectedElementId, 
    selectedSubElement, 
    selectElement, 
    selectSubElement,
    tool,
    setTool,
    activeDrawer,
    closeDrawer
  } = useCanvasStore();
  const { 
    currentProject, 
    updateWall, 
    deleteWall, 
    updateRoom, 
    deleteRoom, 
    updateDoor, 
    deleteDoor, 
    updateWindow, 
    deleteWindow,
    updateProp,
    deleteProp,
    updateStaircase,
    deleteStaircase,
    updateColumn,
    deleteColumn,
    deleteSlabVoid,
    updateSlabVoid,
    detectAndAddRooms
  } = useProjectStore();

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Move className="h-4 w-4" />, label: 'Pan', shortcut: 'H' },
    { id: 'wall', icon: <Hammer className="h-4 w-4" />, label: 'Wall', shortcut: 'W' },
    { id: 'room', icon: <Square className="h-4 w-4" />, label: 'Room Polygon', shortcut: 'R' },
    { id: 'door', icon: <DoorOpen className="h-4 w-4" />, label: 'Door', shortcut: 'D' },
    { id: 'window', icon: <AppWindow className="h-4 w-4" />, label: 'Window', shortcut: 'Win' },
    { 
      id: 'stair', 
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 5h-4v4h-4v4H7v4H3v2h18V5z" />
        </svg>
      ), 
      label: 'Stairs', 
      shortcut: 'S' 
    },
    { 
      id: 'column', 
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="4" width="14" height="16" rx="1" />
          <line x1="9" y1="4" x2="9" y2="20" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      ), 
      label: 'RC Column', 
      shortcut: 'C' 
    },
  ];

  if (activeDrawer !== 'properties' || !currentProject) return null;

  const floor = currentProject.floors.find((f) => f.id === currentProject.activeFloorId);
  if (!floor) return null;

  // Find targeted sub-element or element
  let selectedDoor: { door: Door; wallId: string } | null = null;
  let selectedWin: { win: import('@/core/domain/types').Window; wallId: string } | null = null;

  if (selectedSubElement?.type === 'door' && selectedSubElement.parentWallId) {
    const parentWall = floor.walls.find((w) => w.id === selectedSubElement.parentWallId);
    const d = parentWall?.doors.find((item) => item.id === selectedSubElement.id);
    if (d && parentWall) selectedDoor = { door: d, wallId: parentWall.id };
  } else if (selectedSubElement?.type === 'window' && selectedSubElement.parentWallId) {
    const parentWall = floor.walls.find((w) => w.id === selectedSubElement.parentWallId);
    const w = parentWall?.windows.find((item) => item.id === selectedSubElement.id);
    if (w && parentWall) selectedWin = { win: w, wallId: parentWall.id };
  }

  const selectedProp = selectedSubElement?.type === 'prop' 
    ? floor.props?.find((p) => p.id === selectedSubElement.id) 
    : null;

  const selectedStair = selectedSubElement?.type === 'stair'
    ? floor.stairs?.find((s) => s.id === selectedSubElement.id)
    : null;

  const selectedCol = selectedSubElement?.type === 'column'
    ? floor.columns?.find((c) => c.id === selectedSubElement.id)
    : null;

  const selectedVoid = selectedSubElement?.type === 'void'
    ? floor.voids?.find((v) => v.id === selectedSubElement.id)
    : null;

  const selectedWall = (!selectedDoor && !selectedWin && !selectedProp && !selectedStair && !selectedCol && !selectedVoid) 
    ? floor.walls.find((w) => w.id === selectedElementId) 
    : null;

  const selectedRoom = (!selectedDoor && !selectedWin && !selectedWall && !selectedProp && !selectedStair && !selectedCol && !selectedVoid) 
    ? floor.rooms.find((r) => r.id === selectedElementId) 
    : null;

  const prefUnit = currentProject.settings.preferredUnit;

  const formatLen = (mm: number) => {
    if (prefUnit === 'm') return (mm / 1000).toFixed(2) + ' m';
    if (prefUnit === 'ft') return (mm / 304.8).toFixed(2) + ' ft';
    return Math.round(mm) + ' mm';
  };

  return (
    <div className="w-80 border-r bg-white flex flex-col h-full overflow-y-auto shrink-0 select-none">
      {/* Header bar with collapse button */}
      <div className="h-10 px-3 border-b bg-slate-50 flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">CAD Workspace</span>
        <button
          onClick={() => closeDrawer()}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          title="Collapse Left Sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <FloorManager />

      {/* CAD DESIGN TOOLS PALETTE */}
      <div className="p-3 border-b bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            CAD Tools
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Click or use key</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                tool === t.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title={`${t.label} (Press ${t.shortcut})`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={tool === t.id ? 'text-white' : 'text-slate-500'}>{t.icon}</span>
                <span className="truncate whitespace-nowrap">{t.label}</span>
              </div>
              <kbd className={`px-1 rounded text-[9px] font-mono ${
                tool === t.id ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-400'
              }`}>
                {t.shortcut}
              </kbd>
            </button>
          ))}
        </div>

        {/* Quick Actions (Catalog & Auto-Rooms) */}
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
            title="Open Accessories & Furniture Catalog"
          >
            <Armchair className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="whitespace-nowrap">Props Catalog</span>
          </button>
          
          <button
            onClick={() => {
              const count = detectAndAddRooms(floor.id);
              if (count > 0) alert(`Auto-detected ${count} room(s) from enclosed wall boundaries!`);
              else alert("No new enclosed wall loops found. Draw connected walls first.");
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
            title="Auto-detect rooms from closed wall boundaries"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="whitespace-nowrap">Auto-Rooms</span>
          </button>
        </div>
      </div>
      
      <div className="p-4 flex-1 space-y-4">
        {/* DOOR INSPECTOR */}
        {selectedDoor ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <DoorOpen className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Door Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteDoor(floor.id, selectedDoor!.wallId, selectedDoor!.door.id);
                  selectSubElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                title="Delete Door"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Door Typology</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { id: 'single_swing', label: 'Single Swing' },
                    { id: 'double_entry', label: 'Double Entry' },
                    { id: 'sliding_patio', label: 'Sliding Patio' },
                    { id: 'pocket', label: 'Pocket Door' },
                  ].map((dt) => (
                    <button
                      key={dt.id}
                      onClick={() => updateDoor(floor.id, selectedDoor!.wallId, selectedDoor!.door.id, (d) => {
                        d.doorType = dt.id as DoorType;
                      })}
                      className={`py-1.5 px-2 rounded border text-left ${
                        (selectedDoor!.door.doorType || 'single_swing') === dt.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Door Width</label>
                <div className="grid grid-cols-4 gap-1">
                  {[750, 800, 900, 1000].map((w) => (
                    <button
                      key={w}
                      onClick={() => updateDoor(floor.id, selectedDoor!.wallId, selectedDoor!.door.id, (d) => { d.width = w; })}
                      className={`py-1 rounded text-xs border ${
                        selectedDoor!.door.width === w 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Swing Direction</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { id: 'inward_right', label: 'Inward Right' },
                    { id: 'inward_left', label: 'Inward Left' },
                    { id: 'outward_right', label: 'Outward Right' },
                    { id: 'outward_left', label: 'Outward Left' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => updateDoor(floor.id, selectedDoor!.wallId, selectedDoor!.door.id, (d) => { 
                        d.swingDirection = s.id as Door['swingDirection']; 
                      })}
                      className={`py-1.5 px-2 rounded border text-left ${
                        selectedDoor!.door.swingDirection === s.id 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Offset along wall:</span>
                  <strong className="text-slate-800">{Math.round(selectedDoor.door.offset)} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span>Standard Height:</span>
                  <strong className="text-slate-800">{selectedDoor.door.height} mm</strong>
                </div>
              </div>
            </div>
          </div>
        ) : selectedWin ? (
          /* WINDOW INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <AppWindow className="h-5 w-5 text-sky-600" />
                <h3 className="font-semibold text-slate-800">Window Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteWindow(floor.id, selectedWin!.wallId, selectedWin!.win.id);
                  selectSubElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                title="Delete Window"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Window Typology</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { id: 'sliding', label: 'Sliding Glass' },
                    { id: 'casement', label: 'Casement' },
                    { id: 'louver_ventilator', label: 'Louver Ventilator' },
                    { id: 'fixed', label: 'Fixed Picture' },
                  ].map((wt) => (
                    <button
                      key={wt.id}
                      onClick={() => updateWindow(floor.id, selectedWin!.wallId, selectedWin!.win.id, (win) => {
                        win.windowType = wt.id as WindowType;
                        if (wt.id === 'louver_ventilator') {
                          win.sillHeight = 1500;
                          win.height = 600;
                        }
                      })}
                      className={`py-1.5 px-2 rounded border text-left ${
                        (selectedWin!.win.windowType || 'sliding') === wt.id
                          ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Exterior Weather Protection</label>
                <button
                  onClick={() => updateWindow(floor.id, selectedWin!.wallId, selectedWin!.win.id, (win) => {
                    win.chajjaSunshade = !win.chajjaSunshade;
                  })}
                  className={`w-full py-1.5 px-2 rounded border text-xs font-medium flex items-center justify-between cursor-pointer ${
                    selectedWin!.win.chajjaSunshade
                      ? 'bg-amber-50 border-amber-500 text-amber-800 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Chajja Sunshade (450mm Projection)</span>
                  <span className="text-[10px] uppercase font-bold">{selectedWin!.win.chajjaSunshade ? 'Active' : 'Off'}</span>
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Window Width</label>
                <div className="grid grid-cols-4 gap-1">
                  {[900, 1200, 1500, 1800].map((w) => (
                    <button
                      key={w}
                      onClick={() => updateWindow(floor.id, selectedWin!.wallId, selectedWin!.win.id, (win) => { win.width = w; })}
                      className={`py-1 rounded text-xs border ${
                        selectedWin!.win.width === w 
                          ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Sill Height</label>
                <div className="grid grid-cols-3 gap-1">
                  {[600, 900, 1050].map((h) => (
                    <button
                      key={h}
                      onClick={() => updateWindow(floor.id, selectedWin!.wallId, selectedWin!.win.id, (win) => { win.sillHeight = h; })}
                      className={`py-1 rounded text-xs border ${
                        selectedWin!.win.sillHeight === h 
                          ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {h}mm
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Offset along wall:</span>
                  <strong className="text-slate-800">{Math.round(selectedWin.win.offset)} mm</strong>
                </div>
                <div className="flex justify-between">
                  <span>Window Height:</span>
                  <strong className="text-slate-800">{selectedWin.win.height} mm</strong>
                </div>
              </div>
            </div>
          </div>
        ) : selectedProp ? (
          /* PROP INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <Armchair className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Prop Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteProp(floor.id, selectedProp.id);
                  selectSubElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                title="Delete Prop"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Prop Name</label>
                <input
                  type="text"
                  value={selectedProp.name}
                  onChange={(e) => updateProp(floor.id, selectedProp.id, (p) => { p.name = e.target.value; })}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Category</span>
                  <span className="font-bold text-slate-800 capitalize">{selectedProp.category}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Type</span>
                  <span className="font-bold text-slate-800 capitalize">{selectedProp.propType}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Dimensions</span>
                  <span className="font-bold text-slate-800">{selectedProp.dimensions.width} × {selectedProp.dimensions.depth} mm</span>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Rotation</span>
                  <span className="font-bold text-slate-800">{selectedProp.rotation || 0}°</span>
                </div>
              </div>

              {/* Exact Position (X & Y) in Millimeters */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">Position X (mm)</label>
                  <input
                    type="number"
                    step={100}
                    value={Math.round(selectedProp.position.x)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) {
                        updateProp(floor.id, selectedProp.id, (p) => { p.position.x = val; });
                      }
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">Position Y (mm)</label>
                  <input
                    type="number"
                    step={100}
                    value={Math.round(selectedProp.position.y)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) {
                        updateProp(floor.id, selectedProp.id, (p) => { p.position.y = val; });
                      }
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Interactive Nudge / Move D-Pad */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <Move className="h-3.5 w-3.5 text-indigo-600" /> Move & Nudge Prop
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">100mm steps</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.position.y -= 100; })}
                    className="h-6 w-16 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Move Up 100mm"
                  >
                    ▲
                  </button>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.position.x -= 100; })}
                      className="h-6 w-16 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Move Left 100mm"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.position.x += 100; })}
                      className="h-6 w-16 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Move Right 100mm"
                    >
                      ▶
                    </button>
                  </div>
                  <button
                    onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.position.y += 100; })}
                    className="h-6 w-16 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 flex items-center justify-center text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Move Down 100mm"
                  >
                    ▼
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-1.5">
                  Or drag directly on canvas with your mouse!
                </p>
              </div>

              {/* Rotation Controls (-90, +90, 180) */}
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">Rotation Angle</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.rotation = ((p.rotation || 0) + 270) % 360; })}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                    title="Rotate 90° Counter-Clockwise"
                  >
                    <RotateCcw className="h-3 w-3 text-indigo-600" />
                    <span>-90°</span>
                  </button>
                  <button
                    onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.rotation = ((p.rotation || 0) + 90) % 360; })}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="h-3 w-3 text-indigo-600" />
                    <span>+90°</span>
                  </button>
                  <button
                    onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.rotation = ((p.rotation || 0) + 180) % 360; })}
                    className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                    title="Flip 180°"
                  >
                    <span>180°</span>
                  </button>
                </div>
              </div>

              {/* Specifications list */}
              {selectedProp.specifications && Object.keys(selectedProp.specifications).length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-semibold text-slate-700 block mb-1">Specifications</span>
                  {Object.entries(selectedProp.specifications).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <strong className="text-slate-800">{String(v)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : selectedStair ? (
          /* STAIRCASSE INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 5h-4v4h-4v4H7v4H3v2h18V5z" />
                </svg>
                <h3 className="font-semibold text-slate-800">Staircase Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteStaircase(floor.id, selectedStair.id);
                  selectSubElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                title="Delete Staircase"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Staircase Typology</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { id: 'dog_leg', label: 'Dog-Leg (Half Turn)' },
                    { id: 'straight', label: 'Straight Flight' },
                    { id: 'spiral', label: 'Spiral / Helical' },
                    { id: 'open_well', label: 'Open-Well' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => updateStaircase(floor.id, selectedStair.id, (s) => {
                        s.stairType = st.id as StairType;
                        if (st.id === 'dog_leg') { s.width = 2050; s.length = 3200; }
                        else if (st.id === 'straight') { s.width = 1000; s.length = 4500; }
                      })}
                      className={`py-1.5 px-2 rounded border text-left cursor-pointer ${
                        selectedStair.stairType === st.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blondel Formula & NBC Compliance Badge */}
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Blondel Ergonomic Score</span>
                  <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">NBC PASS</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  2R + T = 2({selectedStair.riserMm}mm) + {selectedStair.treadMm}mm = {2 * selectedStair.riserMm + selectedStair.treadMm}mm (Optimal: 600–640mm)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Flight Width</span>
                  <strong className="text-slate-800">{selectedStair.width} mm</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Total Run Length</span>
                  <strong className="text-slate-800">{selectedStair.length} mm</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Step Count</span>
                  <strong className="text-slate-800">{selectedStair.stepCount} Steps ({selectedStair.riserMm}mm ea)</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Tread Depth</span>
                  <strong className="text-slate-800">{selectedStair.treadMm} mm</strong>
                </div>
              </div>

              {/* Rotation & Direction Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStaircase(floor.id, selectedStair.id, (s) => {
                    s.direction = s.direction === 'up' ? 'down' : 'up';
                  })}
                  className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded border border-indigo-200 text-center cursor-pointer"
                >
                  Direction: {selectedStair.direction.toUpperCase()}
                </button>
                <button
                  onClick={() => updateStaircase(floor.id, selectedStair.id, (s) => {
                    s.rotation = ((s.rotation || 0) + 90) % 360;
                  })}
                  className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCw className="h-3 w-3 text-indigo-600" />
                  <span>Rotate 90° ({selectedStair.rotation}°)</span>
                </button>
              </div>
            </div>
          </div>
        ) : selectedCol ? (
          /* STRUCTURAL COLUMN INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <svg className="h-5 w-5 text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="4" width="14" height="16" rx="1" />
                  <line x1="9" y1="4" x2="9" y2="20" />
                  <line x1="15" y1="4" x2="15" y2="20" />
                </svg>
                <h3 className="font-semibold text-slate-800">RC Column Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteColumn(floor.id, selectedCol.id);
                  selectSubElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                title="Delete Column"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Standard RC Section</label>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {[
                    { label: '230×450', w: 230, d: 450 },
                    { label: '300×300', w: 300, d: 300 },
                    { label: '230×230', w: 230, d: 230 },
                  ].map((cs) => (
                    <button
                      key={cs.label}
                      onClick={() => updateColumn(floor.id, selectedCol.id, (c) => {
                        c.width = cs.w;
                        c.depth = cs.d;
                      })}
                      className={`py-1.5 rounded border text-center cursor-pointer ${
                        selectedCol.width === cs.w && selectedCol.depth === cs.d
                          ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cs.label}mm
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Position (X, Y)</span>
                  <strong className="text-slate-800">{Math.round(selectedCol.position.x)}, {Math.round(selectedCol.position.y)} mm</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Orientation</span>
                  <strong className="text-slate-800">{selectedCol.rotation || 0}°</strong>
                </div>
              </div>

              <button
                onClick={() => updateColumn(floor.id, selectedCol.id, (c) => {
                  c.rotation = ((c.rotation || 0) + 90) % 180;
                })}
                className="w-full py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5 text-indigo-600" />
                <span>Toggle Orientation (0° / 90°)</span>
              </button>
            </div>
          </div>
        ) : selectedVoid ? (
          /* SLAB VOID INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <Square className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold text-slate-800">Slab Void Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteSlabVoid(floor.id, selectedVoid.id);
                  selectSubElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                title="Delete Slab Void"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Void Label</label>
                <input
                  type="text"
                  value={selectedVoid.name}
                  onChange={(e) => updateSlabVoid(floor.id, selectedVoid.id, (v) => { v.name = e.target.value; })}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1">
                <span className="font-semibold block">Vertical Floor Cutout</span>
                <p>Represents an open-to-below ceiling void or stairwell shaft piercing through this floor slab.</p>
              </div>
            </div>
          </div>
        ) : selectedWall ? (
          /* WALL INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <Hammer className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Wall Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteWall(floor.id, selectedWall.id);
                  selectElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                title="Delete Wall"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Wall Typology</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {[
                    { id: 'exterior_bearing', label: 'Load-Bearing (230mm)', t: 230 },
                    { id: 'interior_partition', label: 'Partition (115mm)', t: 115 },
                    { id: 'wet_chase', label: 'Plumbing Wall (150mm)', t: 150 },
                    { id: 'parapet', label: 'Parapet Railing (100mm)', t: 100 },
                  ].map((wt) => (
                    <button
                      key={wt.id}
                      onClick={() => updateWall(floor.id, selectedWall.id, (w) => {
                        w.wallType = wt.id as WallType;
                        w.thickness = wt.t;
                      })}
                      className={`py-1.5 px-2 rounded border text-left cursor-pointer ${
                        (selectedWall.wallType || 'exterior_bearing') === wt.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {wt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-500">Length:</span>
                  <strong className="text-slate-900">{formatLen(wallLength(selectedWall))}</strong>
                  
                  <span className="text-slate-500">Start (X, Y):</span>
                  <span className="text-slate-700">{Math.round(selectedWall.start.x)}, {Math.round(selectedWall.start.y)}</span>

                  <span className="text-slate-500">End (X, Y):</span>
                  <span className="text-slate-700">{Math.round(selectedWall.end.x)}, {Math.round(selectedWall.end.y)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Thickness (mm)</label>
                <div className="grid grid-cols-4 gap-1">
                  {[100, 115, 150, 230].map((t) => (
                    <button
                      key={t}
                      onClick={() => updateWall(floor.id, selectedWall.id, (w) => { w.thickness = t; })}
                      className={`py-1 rounded text-xs border cursor-pointer ${
                        selectedWall.thickness === t 
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-semibold' 
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t}mm
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Installed Doors:</span>
                  <span className="font-semibold text-slate-800">{selectedWall.doors.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Installed Windows:</span>
                  <span className="font-semibold text-slate-800">{selectedWall.windows.length}</span>
                </div>
              </div>
            </div>
          </div>
        ) : selectedRoom ? (
          /* ROOM INSPECTOR */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center space-x-2">
                <Square className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Room Properties</h3>
              </div>
              <button 
                onClick={() => {
                  deleteRoom(floor.id, selectedRoom.id);
                  selectElement(null);
                }}
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                title="Delete Room"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Room Name</label>
                <input
                  type="text"
                  value={selectedRoom.name}
                  onChange={(e) => updateRoom(floor.id, selectedRoom.id, (r) => { r.name = e.target.value; })}
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">Type Preset</label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {ROOM_TYPE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => updateRoom(floor.id, selectedRoom.id, (r) => { 
                        r.name = p.name; 
                        r.color = p.color; 
                      })}
                      className="py-1 px-2 rounded border border-slate-200 text-left hover:bg-slate-50 flex items-center space-x-1.5"
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Area and Perimeter */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Calculated Floor Area:</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {(polygonArea(selectedRoom.polygon) / 1_000_000).toFixed(2)} m²
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      ({(polygonArea(selectedRoom.polygon) / 92903.04).toFixed(1)} sq ft)
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">Perimeter:</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {(polygonPerimeter(selectedRoom.polygon) / 1000).toFixed(2)} m
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      ({(polygonPerimeter(selectedRoom.polygon) / 304.8).toFixed(1)} ft)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* EMPTY STATE / PROJECT OVERVIEW */
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Info className="h-4 w-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">Floor Overview</h3>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span>Total Walls:</span>
                <strong className="text-slate-900">{floor.walls.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Total Rooms:</span>
                <strong className="text-slate-900">{floor.rooms.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Doors Placed:</span>
                <strong className="text-slate-900">{floor.walls.reduce((acc, w) => acc + w.doors.length, 0)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Windows Placed:</span>
                <strong className="text-slate-900">{floor.walls.reduce((acc, w) => acc + w.windows.length, 0)}</strong>
              </div>
            </div>

            <div className="border border-indigo-100 bg-indigo-50/50 rounded-lg p-3 text-xs text-indigo-900 space-y-1.5">
              <span className="font-semibold block text-indigo-700">Quick CAD Tips:</span>
              <p>• <strong>Wall (W):</strong> Click & drag to draw a wall. Snaps to grid & vertices.</p>
              <p>• <strong>Door (D):</strong> Hover near any wall and click to insert.</p>
              <p>• <strong>Window (Win):</strong> Hover near any wall and click to insert.</p>
              <p>• <strong>Auto-Rooms:</strong> Draw closed wall loops, then click &quot;Auto-Rooms&quot; in the top bar.</p>
              <p>• <strong>Pan (H / Space):</strong> Hold spacebar or middle-click and drag.</p>
              <p>• <strong>Delete:</strong> Press Backspace or Delete to remove selected element.</p>
            </div>
          </div>
        )}
      </div>

      {/* Accessories & Furniture Catalog Modal */}
      <PropsCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />
    </div>
  );
}
