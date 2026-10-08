"use client";

import React from 'react';
import { useProjectStore } from '@/store/project-store';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function FloorManager() {
  const { currentProject, addFloor, deleteFloor } = useProjectStore();
  
  if (!currentProject) return null;

  const handleAddFloor = () => {
    const highestLevel = Math.max(...currentProject.floors.map(f => f.level), 0);
    addFloor({
      id: uuidv4(),
      projectId: currentProject.id,
      level: highestLevel + 1,
      name: `Floor ${highestLevel + 1}`,
      elevation: (highestLevel + 1) * currentProject.settings.defaultCeilingHeight,
      height: currentProject.settings.defaultCeilingHeight,
      walls: [],
      rooms: []
    });
  };

  return (
    <div className="p-4 border-b bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Layers className="h-4 w-4" /> Floors
        </h3>
        <button onClick={handleAddFloor} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1">
        {currentProject.floors.slice().sort((a, b) => b.level - a.level).map((floor) => (
          <div 
            key={floor.id} 
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer ${currentProject.activeFloorId === floor.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}
            onClick={() => {
              if (currentProject.activeFloorId !== floor.id) {
                // We'd ideally dispatch this via an action that updates the active floor
                // For now, let's assume we update the active floor in the store
                const nextProject = { ...currentProject, activeFloorId: floor.id };
                useProjectStore.setState({ currentProject: nextProject });
              }
            }}
          >
            <span>{floor.name}</span>
            {currentProject.floors.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); deleteFloor(floor.id); }}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
