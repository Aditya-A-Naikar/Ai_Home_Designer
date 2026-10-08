"use client";

import React from 'react';
import { useProjectStore } from '@/store/project-store';
import { Layers, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCanvasStore } from '@/store/canvas-store';

export function FloorManager() {
  const { currentProject, addFloor, deleteFloor } = useProjectStore();
  const { showUnderlay, toggleShowUnderlay, setActiveFloor } = useCanvasStore();
  
  if (!currentProject) return null;

  const handleAddFloor = () => {
    const highestLevel = Math.max(...currentProject.floors.map(f => f.level), 0);
    const newFloorId = uuidv4();
    addFloor({
      id: newFloorId,
      projectId: currentProject.id,
      level: highestLevel + 1,
      name: `Floor ${highestLevel + 1}`,
      elevation: (highestLevel + 1) * currentProject.settings.defaultCeilingHeight,
      height: currentProject.settings.defaultCeilingHeight,
      walls: [],
      rooms: [],
      props: [],
      stairs: [],
      voids: [],
      columns: [],
    });
  };

  const isDuplex = currentProject.typology === 'duplex_vertical' || currentProject.typology === 'duplex_side_by_side';

  return (
    <div className="p-3 border-b bg-white space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-indigo-600" />
          <h3 className="font-semibold text-xs text-slate-800">Vertical Floors</h3>
          {isDuplex && (
            <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
              DUPLEX
            </span>
          )}
        </div>
        <button 
          onClick={handleAddFloor} 
          className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors cursor-pointer"
          title="Add Additional Floor"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        {currentProject.floors.slice().sort((a, b) => b.level - a.level).map((floor) => {
          const isActive = currentProject.activeFloorId === floor.id;
          return (
            <div 
              key={floor.id} 
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 shadow-xs' 
                  : 'hover:bg-slate-50 text-slate-600 border border-transparent'
              }`}
              onClick={() => {
                if (!isActive) {
                  const nextProject = { ...currentProject, activeFloorId: floor.id };
                  useProjectStore.setState({ currentProject: nextProject });
                  setActiveFloor(floor.id);
                }
              }}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                <span>{floor.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (+{(floor.elevation / 1000).toFixed(1)}m)
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {currentProject.floors.length > 1 && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      deleteFloor(floor.id); 
                    }}
                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 cursor-pointer"
                    title={`Delete ${floor.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Underlay / Ghosting shortcut toggle for upper floors */}
      {currentProject.floors.length > 1 && (
        <button
          onClick={toggleShowUnderlay}
          className={`w-full py-1 px-2 rounded text-[11px] font-medium flex items-center justify-between transition-colors border cursor-pointer ${
            showUnderlay 
              ? 'bg-amber-50/70 border-amber-200 text-amber-800' 
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="Faintly overlays walls and columns from the floor below"
        >
          <span className="flex items-center gap-1.5">
            {showUnderlay ? <Eye className="h-3 w-3 text-amber-600" /> : <EyeOff className="h-3 w-3" />}
            <span>Inter-Floor Ghosting</span>
          </span>
          <span className="text-[9px] font-bold uppercase">{showUnderlay ? 'Visible' : 'Hidden'}</span>
        </button>
      )}
    </div>
  );
}
