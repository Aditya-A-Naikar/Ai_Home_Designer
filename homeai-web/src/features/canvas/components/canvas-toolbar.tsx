"use client";

import React from 'react';
import { useCanvasStore, ToolType } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
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
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Download,
  Upload,
  FileCode,
  Armchair
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
    detectAndAddRooms,
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

  const handleAutoDetectRooms = () => {
    if (!currentProject) return;
    const count = detectAndAddRooms(currentProject.activeFloorId);
    if (count > 0) {
      alert(`Auto-detected ${count} room(s) from enclosed wall boundaries!`);
    } else {
      alert("No new enclosed wall loops found. Try drawing 3 or 4 connected walls first.");
    }
  };

  const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Move className="h-4 w-4" />, label: 'Pan', shortcut: 'H / Space' },
    { id: 'wall', icon: <Hammer className="h-4 w-4" />, label: 'Wall', shortcut: 'W' },
    { id: 'door', icon: <DoorOpen className="h-4 w-4" />, label: 'Door', shortcut: 'D' },
    { id: 'window', icon: <AppWindow className="h-4 w-4" />, label: 'Window', shortcut: 'Win' },
    { id: 'room', icon: <Square className="h-4 w-4" />, label: 'Room Polygon', shortcut: 'R' },
  ];

  return (
    <div className="flex h-14 items-center px-4 border-b bg-white shrink-0 justify-between select-none">
      {/* Primary Tool Palette */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 text-xs font-medium transition-all ${
                tool === t.id 
                  ? 'bg-white shadow-sm text-indigo-600 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Room Auto-Detection Button */}
        <button
          onClick={handleAutoDetectRooms}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
          title="Auto-detect rooms from closed wall cycles"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span className="hidden md:inline">Auto-Rooms</span>
        </button>

        {/* Accessories & Props Catalog Button */}
        <button
          onClick={() => setIsCatalogOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
          title="Open Accessories & Furniture Catalog (Beds, Sofas, TVs)"
        >
          <Armchair className="h-3.5 w-3.5 text-indigo-600" />
          <span className="hidden md:inline">Props Catalog</span>
        </button>
      </div>

      {/* Center Snapping & View Controls */}
      <div className="hidden lg:flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
        {/* Grid Snap Toggle */}
        <button
          onClick={toggleSnapToGrid}
          className={`px-2 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
            snapToGrid ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-200'
          }`}
          title="Toggle Grid Snapping"
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Grid</span>
        </button>

        {/* Vertex / Endpoint Snap Toggle */}
        <button
          onClick={toggleSnapToEndpoints}
          className={`px-2 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
            snapToEndpoints ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-slate-500 hover:bg-slate-200'
          }`}
          title="Toggle Vertex & Endpoint Snapping"
        >
          <Magnet className="h-3.5 w-3.5" />
          <span>Snap</span>
        </button>

        {/* Ortho Snap Toggle */}
        <button
          onClick={toggleOrthoMode}
          className={`px-2 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
            orthoMode ? 'bg-sky-100 text-sky-700 font-medium' : 'text-slate-500 hover:bg-slate-200'
          }`}
          title="Lock angles to Horizontal/Vertical (or hold Shift)"
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Ortho</span>
        </button>

        {/* Dimensions Toggle */}
        <button
          onClick={toggleShowAllDimensions}
          className={`px-2 py-1 rounded text-xs flex items-center space-x-1 transition-colors ${
            showAllDimensions ? 'bg-violet-100 text-violet-700 font-medium' : 'text-slate-500 hover:bg-slate-200'
          }`}
          title="Toggle showing all wall dimensions vs selected only"
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>Dims</span>
        </button>
      </div>

      {/* Right Controls: Zoom, History, Auto-Save */}
      <div className="flex items-center space-x-2">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-0.5 border-r border-slate-200 pr-2">
          <button 
            onClick={() => setZoom(zoom * 1.2)} 
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md" 
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="text-xs font-semibold text-slate-600 px-1 py-1 rounded hover:bg-slate-100 min-w-12 text-center"
            title="Click to reset to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button 
            onClick={() => setZoom(zoom / 1.2)} 
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md" 
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <button 
            onClick={handleFit} 
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md" 
            title="Fit Plan to Viewport"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
        
        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5 border-r border-slate-200 pr-2">
          <button 
            onClick={undo} 
            disabled={past.length === 0} 
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-40" 
            title={`Undo (Ctrl+Z) [${past.length}]`}
          >
            <Undo className="h-4 w-4" />
          </button>
          
          <button 
            onClick={redo} 
            disabled={future.length === 0} 
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md disabled:opacity-40" 
            title={`Redo (Ctrl+Shift+Z / Ctrl+Y) [${future.length}]`}
          >
            <Redo className="h-4 w-4" />
          </button>
        </div>

        {/* Export & Import */}
        <div className="flex items-center space-x-1 border-r border-slate-200 pr-2">
          <button
            onClick={handleExportSvg}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md flex items-center gap-1 text-xs font-medium"
            title="Export Architectural Blueprint (SVG)"
          >
            <FileCode className="h-4 w-4 text-sky-600" />
            <span className="hidden xl:inline">SVG</span>
          </button>

          <button
            onClick={handleExportJson}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md flex items-center gap-1 text-xs font-medium"
            title="Download Project JSON (.homeai.json)"
          >
            <Download className="h-4 w-4 text-indigo-600" />
            <span className="hidden xl:inline">JSON</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md flex items-center gap-1 text-xs font-medium"
            title="Import Project (.homeai.json)"
          >
            <Upload className="h-4 w-4 text-emerald-600" />
            <span className="hidden xl:inline">Import</span>
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
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center text-xs text-slate-500">
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
            className="gap-1.5 h-8 px-3 text-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>

      {/* Props Catalog Modal */}
      <PropsCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />
    </div>
  );
}
