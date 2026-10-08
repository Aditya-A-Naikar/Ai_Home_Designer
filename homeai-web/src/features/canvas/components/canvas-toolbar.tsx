"use client";

import React from 'react';
import { useCanvasStore, ToolType } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { MousePointer2, Hammer, Square, DoorOpen, Maximize, ZoomIn, ZoomOut, Move, Undo, Redo, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fitToContent } from '@/core/canvas/transform';

export function CanvasToolbar() {
  const { tool, setTool, zoom, setZoom, setPanOffset, isModified } = useCanvasStore();
  const { currentProject, undo, redo, past, future, saveProject, isSaving } = useProjectStore();

  const handleFit = () => {
    if (!currentProject) return;
    const floor = currentProject.floors.find(f => f.id === currentProject.activeFloorId);
    if (!floor) return;
    const { zoom: newZoom, panOffset } = fitToContent(floor.walls, window.innerWidth - 640, window.innerHeight - 60);
    setZoom(newZoom);
    setPanOffset(panOffset);
  };

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select (V)' },
    { id: 'pan', icon: <Move className="h-4 w-4" />, label: 'Pan (H)' },
    { id: 'wall', icon: <Hammer className="h-4 w-4" />, label: 'Wall (W)' },
    { id: 'room', icon: <Square className="h-4 w-4" />, label: 'Room (R)' },
    { id: 'door', icon: <DoorOpen className="h-4 w-4" />, label: 'Door (D)' },
  ];

  return (
    <div className="flex h-14 items-center px-4 border-b bg-white shrink-0 justify-between">
      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`p-2 rounded-md flex items-center justify-center transition-colors ${tool === t.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-600 hover:bg-slate-200'}`}
            title={t.label}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 border-r pr-2">
          <button onClick={() => setZoom(zoom * 1.2)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
          <span className="text-xs font-medium text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(zoom / 1.2)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
          <button onClick={handleFit} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md" title="Fit to Screen"><Maximize className="h-4 w-4" /></button>
        </div>
        
        <div className="flex items-center space-x-1 border-r pr-2">
          <button onClick={undo} disabled={past.length === 0} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-50" title="Undo"><Undo className="h-4 w-4" /></button>
          <button onClick={redo} disabled={future.length === 0} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-50" title="Redo"><Redo className="h-4 w-4" /></button>
        </div>

        <Button onClick={saveProject} disabled={!isModified || isSaving} size="sm" variant={isModified ? 'primary' : 'outline'} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
