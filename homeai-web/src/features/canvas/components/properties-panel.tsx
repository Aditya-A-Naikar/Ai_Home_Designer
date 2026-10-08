"use client";

import React from 'react';
import { useCanvasStore } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { FloorManager } from './floor-manager';
import { wallLength } from '@/core/geometry/wall-utils';
import { polygonArea, polygonPerimeter, ROOM_TYPE_PRESETS } from '@/core/geometry/room-utils';
import { Door } from '@/core/domain/types';
import { Trash2, DoorOpen, AppWindow, Square, Hammer, Info, Armchair, RotateCw } from 'lucide-react';

export function PropertiesPanel() {
  const { selectedElementId, selectedSubElement, selectElement, selectSubElement } = useCanvasStore();
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
    deleteProp
  } = useProjectStore();

  if (!currentProject) return null;

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

  const selectedWall = (!selectedDoor && !selectedWin && !selectedProp) 
    ? floor.walls.find((w) => w.id === selectedElementId) 
    : null;

  const selectedRoom = (!selectedDoor && !selectedWin && !selectedWall && !selectedProp) 
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
      <FloorManager />
      
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

              {/* Rotate button */}
              <div>
                <button
                  onClick={() => updateProp(floor.id, selectedProp.id, (p) => { p.rotation = ((p.rotation || 0) + 90) % 360; })}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
                >
                  <RotateCw className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Rotate 90° Clockwise</span>
                </button>
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
                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                title="Delete Wall"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
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
                  {[100, 150, 200, 300].map((t) => (
                    <button
                      key={t}
                      onClick={() => updateWall(floor.id, selectedWall.id, (w) => { w.thickness = t; })}
                      className={`py-1 rounded text-xs border ${
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
    </div>
  );
}
