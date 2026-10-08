"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  Home,
  PanelLeft,
  ChevronDown,
  Sparkles,
  Layers,
  Box,
  LayoutGrid,
  Zap,
  Droplets,
  Wind,
  Calculator,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fitToContent } from '@/core/canvas/transform';
import { downloadProjectJson, parseProjectJson } from '@/core/export/json-exporter';
import { downloadFloorSvg } from '@/core/export/svg-blueprint-exporter';
import { PropsCatalogModal } from './props-catalog-modal';
import { BOQEstimatorModal } from './boq-estimator-modal';
import { PermittingSheetsModal } from './permitting-sheets-modal';

export function CanvasToolbar() {
  const [isBoqOpen, setIsBoqOpen] = useState(false);
  const [isPermittingOpen, setIsPermittingOpen] = useState(false);
  const { 
    viewMode,
    setViewMode,
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
    toggleShowAllDimensions,
    showUnderlay,
    toggleShowUnderlay,
    showMEPElectrical,
    toggleMEPElectrical,
    showMEPPlumbing,
    toggleMEPPlumbing,
    showMEPHVAC,
    toggleMEPHVAC,
    leftSidebarOpen,
    toggleLeftSidebar,
    aiAdvisorOpen,
    toggleAIAdvisor
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  const handleExportJson = () => {
    if (!currentProject) return;
    downloadProjectJson(currentProject);
    setExportMenuOpen(false);
  };

  const handleExportSvg = () => {
    if (!currentProject) return;
    downloadFloorSvg(currentProject, currentProject.activeFloorId);
    setExportMenuOpen(false);
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
    setExportMenuOpen(false);
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

  const cadTools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select', shortcut: 'V' },
    { id: 'pan', icon: <Move className="h-4 w-4" />, label: 'Pan', shortcut: 'H' },
    { id: 'wall', icon: <Hammer className="h-4 w-4" />, label: 'Wall', shortcut: 'W' },
    { id: 'room', icon: <Square className="h-4 w-4" />, label: 'Room', shortcut: 'R' },
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
      label: 'Column', 
      shortcut: 'C' 
    },
  ];

  return (
    <header className="h-12 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between px-3 select-none gap-2 z-20">
      {/* LEFT: Sidebar Toggle, Project Brand & Saved Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={toggleLeftSidebar}
          className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
            leftSidebarOpen 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={leftSidebarOpen ? "Collapse Left Sidebar (CAD Tools & Properties)" : "Open Left Sidebar"}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 pr-2.5 border-r border-slate-200 hover:opacity-85 transition-opacity shrink-0"
          title="Return to Dashboard"
        >
          <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Home className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xs text-slate-900 leading-tight">HomeAI</span>
            <span className="text-[10px] text-slate-500 font-medium leading-none truncate max-w-[90px]">
              {currentProject?.name || 'Untitled'}
            </span>
          </div>
        </Link>

        {/* Persistence Status Badge */}
        <div className="hidden sm:flex items-center text-[11px] text-slate-500 whitespace-nowrap">
          {isSaving ? (
            <span className="flex items-center text-amber-600 font-medium gap-1">
              <RotateCcw className="h-3 w-3 animate-spin" /> Saving...
            </span>
          ) : isModified ? (
            <span className="text-amber-500 font-medium">● Unsaved</span>
          ) : (
            <span className="flex items-center text-emerald-600 gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* CENTER: 2D/3D Mode Switch, Minimalist CAD Dock & Precision Snapping Bar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 2D Plan / 3D View Segmented Switch */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
          <button
            onClick={() => setViewMode('2d')}
            className={`h-8 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '2d'
                ? 'bg-white shadow-xs text-indigo-700 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="2D CAD Blueprint Plan Editor"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">2D Plan</span>
          </button>
          
          <button
            onClick={() => setViewMode('3d')}
            className={`h-8 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === '3d'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title="Interactive 3D Walkthrough & Isometric View"
          >
            <Box className="h-3.5 w-3.5" />
            <span>3D View</span>
          </button>
        </div>

        {/* Compact CAD Tools Dock */}
        <div className="flex items-center space-x-0.5 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
          {cadTools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`h-8 w-8 rounded-md flex items-center justify-center text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                tool === t.id 
                  ? 'bg-white shadow-xs text-indigo-600 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
              title={`${t.label} (Press ${t.shortcut})`}
            >
              <span className={tool === t.id ? 'text-indigo-600' : 'text-slate-600'}>{t.icon}</span>
            </button>
          ))}
        </div>

        {/* Snapping Controls Segmented Bar */}
        <div className="hidden lg:flex items-center space-x-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
          <button
            onClick={toggleSnapToGrid}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              snapToGrid ? 'bg-indigo-100 text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle Grid Snapping"
          >
            <Grid className="h-3 w-3" />
            <span>Grid</span>
          </button>

          <button
            onClick={toggleSnapToEndpoints}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              snapToEndpoints ? 'bg-emerald-100 text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle Vertex Snapping"
          >
            <Magnet className="h-3 w-3" />
            <span>Snap</span>
          </button>

          <button
            onClick={toggleOrthoMode}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              orthoMode ? 'bg-sky-100 text-sky-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Lock Angles to Ortho (Horizontal/Vertical)"
          >
            <Compass className="h-3 w-3" />
            <span>Ortho</span>
          </button>

          <button
            onClick={toggleShowAllDimensions}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showAllDimensions ? 'bg-violet-100 text-violet-700 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle Wall Dimension Labels"
          >
            <Ruler className="h-3 w-3" />
            <span>Dims</span>
          </button>

          <button
            onClick={toggleShowUnderlay}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showUnderlay ? 'bg-amber-100 text-amber-800 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle Multi-Floor Ghost Underlay of Lower Floor"
          >
            <Layers className="h-3 w-3" />
            <span>Underlay</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <button
            onClick={toggleMEPElectrical}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showMEPElectrical ? 'bg-amber-100 text-amber-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle Electrical Schematics Layer (Lights, Fans, Power Outlets)"
          >
            <Zap className="h-3 w-3 text-amber-600" />
            <span>Elec</span>
          </button>

          <button
            onClick={toggleMEPPlumbing}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showMEPPlumbing ? 'bg-cyan-100 text-cyan-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle Plumbing & Sanitary Fixtures Layer (Water Stacks & Riser Shafts)"
          >
            <Droplets className="h-3 w-3 text-cyan-600" />
            <span>Plumb</span>
          </button>

          <button
            onClick={toggleMEPHVAC}
            className={`h-8 px-2 rounded-md text-[11px] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showMEPHVAC ? 'bg-emerald-100 text-emerald-900 font-semibold shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
            title="Toggle HVAC & Ventilation Layer (Split AC & Exhausts)"
          >
            <Wind className="h-3 w-3 text-emerald-600" />
            <span>HVAC</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Zoom, History, Export Dropdown, Save & AI Co-Pilot Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Zoom Controls */}
        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50/70 p-0.5 shrink-0">
          <button 
            onClick={() => setZoom(zoom / 1.2)} 
            className="h-7 w-6 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors cursor-pointer" 
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="h-7 px-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition-colors whitespace-nowrap min-w-[42px] text-center cursor-pointer"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button 
            onClick={() => setZoom(zoom * 1.2)} 
            className="h-7 w-6 flex items-center justify-center text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors cursor-pointer" 
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          
          <button 
            onClick={handleFit} 
            className="h-7 px-1.5 flex items-center gap-1 text-slate-600 hover:bg-white hover:text-slate-900 rounded transition-colors whitespace-nowrap text-[11px] font-medium cursor-pointer border-l border-slate-200 ml-0.5" 
            title="Fit Plan to Viewport"
          >
            <Maximize className="h-3 w-3" />
            <span>Fit</span>
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

        {/* Minimalist Export & Import Dropdown (Replaces 3 huge buttons with 1 clean menu) */}
        <div className="relative shrink-0" ref={exportDropdownRef}>
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="h-8 px-2 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
            title="Export blueprint or import project files"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={handleExportSvg}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FileCode className="h-4 w-4 text-sky-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Architectural Blueprint (SVG)</span>
                  <span className="text-[10px] text-slate-400">Scale drawing ready for print & CAD</span>
                </div>
              </button>

              <button
                onClick={handleExportJson}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
              >
                <Download className="h-4 w-4 text-indigo-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Export Project File (.json)</span>
                  <span className="text-[10px] text-slate-400">Save complete editable floor plan data</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  setIsBoqOpen(true);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
              >
                <Calculator className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Cost Estimator & BOQ</span>
                  <span className="text-[10px] text-slate-400">Detailed material takeoff & budget</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  setIsPermittingOpen(true);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
              >
                <FileText className="h-4 w-4 text-cyan-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Permitting Blueprint Set (A101–A105)</span>
                  <span className="text-[10px] text-slate-400">5-sheet package ready for PDF print</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setExportMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
              >
                <Upload className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800">Import Project File (.json)</span>
                  <span className="text-[10px] text-slate-400">Restore or load an existing plan</span>
                </div>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.homeai.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={saveProject} 
          disabled={!isModified || isSaving} 
          size="sm" 
          variant={isModified ? 'primary' : 'outline'} 
          className="h-8 px-2.5 text-xs gap-1.5 whitespace-nowrap shrink-0 font-medium"
        >
          <Save className="h-3.5 w-3.5" />
          <span>Save</span>
        </Button>

        {/* AI Co-Pilot Toggle Button */}
        <button
          onClick={toggleAIAdvisor}
          className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
            aiAdvisorOpen 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}
          title={aiAdvisorOpen ? "Collapse AI Architect Co-Pilot" : "Open AI Architect Co-Pilot"}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Co-Pilot</span>
        </button>
      </div>

      {/* Accessories & Props Catalog Modal */}
      <PropsCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />

      {/* Bill of Quantities (BOQ) & Cost Estimator Modal */}
      {currentProject && (
        <BOQEstimatorModal 
          project={currentProject} 
          isOpen={isBoqOpen} 
          onClose={() => setIsBoqOpen(false)} 
        />
      )}

      {/* Multi-Sheet Architectural Permitting Package Modal */}
      {currentProject && (
        <PermittingSheetsModal 
          project={currentProject} 
          isOpen={isPermittingOpen} 
          onClose={() => setIsPermittingOpen(false)} 
        />
      )}
    </header>
  );
}
