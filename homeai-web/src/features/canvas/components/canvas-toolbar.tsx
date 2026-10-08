"use client";

import React from 'react';
import { useCanvasStore, ToolType } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import Link from 'next/link';
import { 
  MousePointer2, 
  Hammer, 
  Square, 
  DoorOpen, 
  AppWindow,
  Maximize, 
  ZoomIn, 
  ZoomOut, 
  Move, 
  Undo, 
  Redo, 
  Save,
  Grid,
  Magnet,
  Compass,
  Ruler,
  CheckCircle2,
  RotateCcw,
  Download,
  Upload,
  FileCode,
  Armchair,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fitToContent } from '@/core/canvas/transform';
import { downloadProjectJson, parseProjectJson } from '@/core/export/json-exporter';
import { downloadFloorSvg } from '@/core/export/svg-blueprint-exporter';
import { PropsCatalogModal } from './props-catalog-modal';

export function CanvasToolbar() {
  const { 
    tool, 
    setTool, 
    zoom, 
    setZoom, 
    setPanOffset, 
    isModified,
    snapToGrid,
    toggleSnapToGrid,
    snapToEndpoints,
    toggleSnapToEndpoints,
    orthoMode,
    toggleOrthoMode,
    showAllDimensions,
    toggleShowAllDimensions
  } = useCanvasStore();

  const { 
    currentProject, 
    undo, 
    redo, 
    past, 
    future, 
    saveProject, 
    isSaving,
    importProject
  } = useProjectStore();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isCatalogOpen, setIsCatalogOpen] = React.useState(false);

  const handleExportJson = () => {
    if (!currentProject) return;
    downloadProjectJson(currentProject);
  };

  const handleExportSvg = () => {
    if (!currentProject) return;
    downloadFloorSvg(currentProject, currentProject.activeFloorId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const parseResult = parseProjectJson(content);
      if (parseResult.success && parseResult.project) {
        await importProject(parseResult.project);
        alert(`Successfully imported project: "${parseResult.project.name}"`);
      } else {
        alert(`Failed to import project: ${parseResult.error || 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFit = () => {
    if (!currentProject) return;
    const floor = currentProject.floors.find(f => f.id === currentProject.activeFloorId);
    if (!floor) return;
    const { zoom: newZoom, panOffset } = fitToContent(floor.walls, window.innerWidth - 640, window.innerHeight - 60);
    setZoom(newZoom);
    setPanOffset(panOffset);
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPanOffset({ x: 200, y: 150 });
  };

  const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-3.5 w-3.5" />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Move className="h-3.5 w-3.5" />, label: 'Pan', shortcut: 'H' },
    { id: 'wall', icon: <Hammer className="h-3.5 w-3.5" />, label: 'Wall', shortcut: 'W' },
    { id: 'room', icon: <Square className="h-3.5 w-3.5" />, label: 'Room', shortcut: 'R' },
    { id: 'door', icon: <DoorOpen className="h-3.5 w-3.5" />, label: 'Door', shortcut: 'D' },
    { id: 'window', icon: <AppWindow className="h-3.5 w-3.5" />, label: 'Window', shortcut: 'Win' },
  ];

  return (
    <header className="h-12 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between px-3 select-none gap-2 z-20">
      {/* Left: Brand Navigation & Compact CAD Tool Palette */}
      <div className="flex items-center gap-2 shrink-0">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 pr-3 border-r border-slate-200 hover:opacity-85 transition-opacity shrink-0"
          title="Return to Dashboard"
        >
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Home className="h-4 w-4" />
          </div>
          <div className="hidden xl:flex flex-col">
            <span className="font-bold text-xs text-slate-900 leading-tight">HomeAI</span>
            <span className="text-[10px] text-slate-500 font-medium leading-none truncate max-w-[110px]">
              {currentProject?.name || 'Untitled'}
            </span>
          </div>
        </Link>

        {/* Primary Tool Switcher (Strictly single-line, uniform h-8, no text wrapping) */}
        <div className="flex items-center space-x-1 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                tool === t.id 
                  ? 'bg-white shadow-xs text-indigo-600 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
              title={`${t.label} (Press ${t.shortcut})`}
            >
              <span className={tool === t.id ? 'text-indigo-600' : 'text-slate-500'}>{t.icon}</span>
              <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Props Catalog Button */}
        <button
          onClick={() => setIsCatalogOpen(true)}
          className="h-8 px-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          title="Open Accessories & Furniture Catalog (Beds, Sofas, TVs)"
        >
          <Armchair className="h-3.5 w-3.5 text-indigo-600" />
          <span className="hidden xl:inline">Props</span>
        </button>
      </div>

      {/* Center: CAD Snapping & Precision Precision Controls */}
      <div className="hidden lg:flex items-center space-x-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
        <button
          onClick={toggleSnapToGrid}
          className={`h-8 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            snapToGrid ? 'bg-indigo-100 text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
          title="Toggle Grid Snapping"
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Grid</span>
        </button>

        <button
          onClick={toggleSnapToEndpoints}
          className={`h-8 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            snapToEndpoints ? 'bg-emerald-100 text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
          title="Toggle Endpoint & Vertex Snapping"
        >
          <Magnet className="h-3.5 w-3.5" />
          <span>Snap</span>
        </button>

        <button
          onClick={toggleOrthoMode}
          className={`h-8 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            orthoMode ? 'bg-sky-100 text-sky-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
          title="Lock Angles to Horizontal & Vertical (Ortho)"
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Ortho</span>
        </button>

        <button
          onClick={toggleShowAllDimensions}
          className={`h-8 px-2.5 rounded-md text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            showAllDimensions ? 'bg-violet-100 text-violet-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
          }`}
          title="Toggle Wall Dimension Labels"
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Dims</span>
        </button>
      </div>

      {/* Right: Zoom, History, Export, and Save Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Zoom Controls */}
        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/70 p-0.5 shrink-0">
          <button 
            onClick={() => setZoom(zoom / 1.2)} 
            className="h-7 w-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors cursor-pointer" 
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="h-7 px-2 text-xs font-semibold text-slate-700 hover:bg-white rounded transition-colors whitespace-nowrap min-w-[50px] text-center cursor-pointer"
            title="Reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button 
            onClick={() => setZoom(zoom * 1.2)} 
            className="h-7 w-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors cursor-pointer" 
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          
          <button 
            onClick={handleFit} 
            className="h-7 px-2 flex items-center gap-1 text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors whitespace-nowrap text-xs font-medium cursor-pointer border-l border-slate-200 ml-0.5" 
            title="Fit Plan to Viewport"
          >
            <Maximize className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Fit</span>
          </button>
        </div>
        
        {/* Undo / Redo */}
        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/70 p-0.5 shrink-0">
          <button 
            onClick={undo} 
            disabled={past.length === 0} 
            className="h-7 w-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 rounded disabled:opacity-40 transition-colors cursor-pointer" 
            title={`Undo (Ctrl+Z) [${past.length}]`}
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          
          <button 
            onClick={redo} 
            disabled={future.length === 0} 
            className="h-7 w-7 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 rounded disabled:opacity-40 transition-colors cursor-pointer" 
            title={`Redo (Ctrl+Shift+Z / Ctrl+Y) [${future.length}]`}
          >
            <Redo className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Blueprint, Export & Import */}
        <div className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2 shrink-0">
          <button
            onClick={handleExportSvg}
            className="h-8 px-2 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="Export Architectural Blueprint (SVG)"
          >
            <FileCode className="h-3.5 w-3.5 text-sky-600" />
            <span>Blueprint</span>
          </button>

          <button
            onClick={handleExportJson}
            className="h-8 px-2 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="Export Project File (.homeai.json)"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Export</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="Import Project (.homeai.json)"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-600" />
            <span>Import</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.homeai.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Persistence status & Save button */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-2 shrink-0">
          <div className="hidden md:flex items-center text-xs text-slate-500 whitespace-nowrap">
            {isSaving ? (
              <span className="flex items-center text-amber-600 font-medium gap-1">
                <RotateCcw className="h-3 w-3 animate-spin" /> Saving...
              </span>
            ) : isModified ? (
              <span className="text-amber-500 font-medium">Unsaved</span>
            ) : (
              <span className="flex items-center text-emerald-600 gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>

          <Button 
            onClick={saveProject} 
            disabled={!isModified || isSaving} 
            size="sm" 
            variant={isModified ? 'primary' : 'outline'} 
            className="h-8 px-3 text-xs gap-1.5 whitespace-nowrap shrink-0 font-medium"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>

      {/* Accessories & Props Catalog Modal */}
      <PropsCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />
    </header>
  );
}
