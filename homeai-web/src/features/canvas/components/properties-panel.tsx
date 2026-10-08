"use client";

import React from 'react';
import { useCanvasStore } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { FloorManager } from './floor-manager';
import { wallLength } from '@/core/geometry/wall-utils';
import { polygonArea } from '@/core/geometry/room-utils';

export function PropertiesPanel() {
  const { selectedElementId } = useCanvasStore();
  const { currentProject, deleteWall, deleteRoom } = useProjectStore();

  if (!currentProject) return null;

  const floor = currentProject.floors.find(f => f.id === currentProject.activeFloorId);
  if (!floor) return null;

  const selectedWall = floor.walls.find(w => w.id === selectedElementId);
  const selectedRoom = floor.rooms.find(r => r.id === selectedElementId);

  return (
    <div className="w-80 border-r bg-white flex flex-col h-full overflow-y-auto shrink-0">
      <FloorManager />
      
      <div className="p-4 flex-1">
        <h3 className="font-semibold text-slate-800 mb-4">Properties</h3>
        
        {selectedWall ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Wall</span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Length</span>
                <span className="font-medium text-slate-900">{Math.round(wallLength(selectedWall))} mm</span>
                <span className="text-slate-500">Thickness</span>
                <span className="font-medium text-slate-900">{selectedWall.thickness} mm</span>
                <span className="text-slate-500">Doors/Windows</span>
                <span className="font-medium text-slate-900">{selectedWall.doors.length + selectedWall.windows.length}</span>
              </div>
            </div>
            <button 
              onClick={() => {
                deleteWall(floor.id, selectedWall.id);
                useCanvasStore.getState().selectElement(null);
              }}
              className="w-full py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
            >
              Delete Wall
            </button>
          </div>
        ) : selectedRoom ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Room</span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Name</span>
                <span className="font-medium text-slate-900">{selectedRoom.name}</span>
                <span className="text-slate-500">Area</span>
                <span className="font-medium text-slate-900">{Math.round(polygonArea(selectedRoom.polygon) / 1_000_000)} m²</span>
              </div>
            </div>
            <button 
              onClick={() => {
                deleteRoom(floor.id, selectedRoom.id);
                useCanvasStore.getState().selectElement(null);
              }}
              className="w-full py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
            >
              Delete Room
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-500 text-center mt-10">
            Select an element on the canvas to view and edit its properties.
          </div>
        )}
      </div>
    </div>
  );
}
