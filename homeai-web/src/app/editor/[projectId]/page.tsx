"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { CanvasToolbar } from '@/features/canvas/components/canvas-toolbar';
import { PropertiesPanel } from '@/features/canvas/components/properties-panel';
import { CanvasViewport } from '@/features/canvas/components/canvas-viewport';
import { Viewport3D } from '@/features/canvas/components/viewport-3d';
import { AIAdvisorPanel } from '@/features/ai-advisor/components/ai-advisor-panel';
import { UserJourneyStepper } from '@/features/canvas/components/user-journey-stepper';
import { ArchitecturalNavSidebar } from '@/features/canvas/components/architectural-nav-sidebar';
import { FurnitureCatalogDock } from '@/features/canvas/components/furniture-catalog-dock';
import { MaterialsColorsDock } from '@/features/canvas/components/materials-colors-dock';
import { BottomFeatureStrip } from '@/features/canvas/components/bottom-feature-strip';
import { FloorPlanConfirmationModal } from '@/features/canvas/components/floor-plan-confirmation-modal';
import { BOQEstimatorModal } from '@/features/canvas/components/boq-estimator-modal';
import { PermittingSheetsModal } from '@/features/canvas/components/permitting-sheets-modal';
import { AIRenderStudioModal } from '@/features/canvas/components/ai-render-studio-modal';
import { MLOpsPipelineModal } from '@/features/canvas/components/mlops-pipeline-modal';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, Upload, AlertCircle, Check } from 'lucide-react';
import { parseProjectJson } from '@/core/export/json-exporter';

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { loadProject, isLoading, error, currentProject, undo, redo, saveProject, importProject } = useProjectStore();
  const { 
    viewMode,
    setViewMode,
    setTool, 
    selectElement, 
    selectSubElement, 
    isModified,
    activeDrawer,
    closeDrawer,
  } = useCanvasStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [showBoqModal, setShowBoqModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMlopsModal, setShowMlopsModal] = useState(false);

  const recoveryInputRef = useRef<HTMLInputElement>(null);

  const handleRecoveryFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const parseResult = parseProjectJson(content);
      if (parseResult.success && parseResult.project) {
        await importProject(parseResult.project);
      } else {
        alert(`Failed to import backup: ${parseResult.error || 'Corrupted file'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Responsive workspace layout tracking
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [workspaceWidth, setWorkspaceWidth] = useState<number>(1280);

  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const updateWidth = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setWorkspaceWidth(rect.width);
      }
    };

    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setWorkspaceWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Responsive breakpoint: docked mode at >= 1024px workspace width, overlay below
  const isDocked = workspaceWidth >= 1024;
  const isNarrowScreen = workspaceWidth < 768;
  const [dismissMobileAdvisory, setDismissMobileAdvisory] = useState(false);

  // Action Toast State (FIX-04)
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setActionToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setActionToast(null);
    }, 1800);
  };

  // Initialize activeDrawer to 'none' on entry to project editor
  useEffect(() => {
    closeDrawer();
  }, [projectId, closeDrawer]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('view') === '3d') {
        setViewMode('3d');
      }
    }
  }, [setViewMode]);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // Debounced auto-save
  useEffect(() => {
    if (!isModified || !currentProject) return;

    const timer = setTimeout(() => {
      saveProject();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isModified, currentProject, saveProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'escape':
          if (activeDrawer !== 'none') {
            closeDrawer();
          } else {
            setTool('select');
            selectElement(null);
            selectSubElement(null);
          }
          break;
        case 'v': setTool('select'); break;
        case 'w': setTool('wall'); break;
        case 'r': setTool('room'); break;
        case 'd': setTool('door'); break;
        case 'h': setTool('pan'); break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              redo();
              showToast('Redo applied');
            } else {
              undo();
              showToast('Undo applied');
            }
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redo();
            showToast('Redo applied');
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveProject();
            showToast('Project saved');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, selectElement, selectSubElement, undo, redo, saveProject, activeDrawer, closeDrawer]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-mono text-sm">Loading architectural workstation...</div>;
  }

  if (error || !currentProject) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4" data-testid="project-load-error-container">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Unable to Load Project</h2>
            <p className="text-xs text-rose-300 mt-1.5 font-mono break-words bg-rose-950/30 p-2 rounded border border-rose-900/50">
              {error || 'Project not found in storage'}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              The project data may be damaged, tampered with, or expired. You can retry loading, restore from a downloaded backup JSON, or return to the dashboard.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => projectId && loadProject(projectId)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              data-testid="error-retry-button"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry Loading
            </button>
            <input
              type="file"
              ref={recoveryInputRef}
              onChange={handleRecoveryFile}
              accept=".json,.homeai.json"
              className="hidden"
              data-testid="recovery-file-input"
            />
            <button
              onClick={() => recoveryInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              data-testid="error-restore-backup-button"
            >
              <Upload className="h-3.5 w-3.5" /> Restore from JSON Backup
            </button>
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              <Home className="h-3.5 w-3.5" /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#080d1a] overflow-hidden select-none relative">
      {/* Mobile / Narrow Viewport Advisory Banner (FIX-05) */}
      {isNarrowScreen && !dismissMobileAdvisory && (
        <div
          data-testid="mobile-advisory-banner"
          className="w-full bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 z-40 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px]">CAD drafting is optimized for desktop and tablet screens. Viewing mode is active.</span>
          </div>
          <button
            onClick={() => setDismissMobileAdvisory(true)}
            className="text-amber-400 hover:text-amber-200 text-xs px-1 cursor-pointer"
            aria-label="Dismiss mobile advisory"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ephemeral Action Toast (FIX-04) */}
      {actionToast && (
        <div
          data-testid="editor-action-toast"
          className="absolute top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 text-slate-100 text-xs font-semibold border border-slate-700 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* 1. Top Workflow Journey Stepper (7 Stages matching Reference UI) */}
      <UserJourneyStepper
        onOpenConfirmModal={() => setShowConfirmModal(true)}
        onOpenRenderStudio={() => setShowRenderModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
      />

      {/* 2. Top CAD & Viewport Toolbar */}
      <CanvasToolbar />

      {/* 3. Central Multi-Panel Architectural Workstation */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {/* Column 1: Left Architectural Nav Sidebar (Independent collapse state) */}
        <ArchitecturalNavSidebar
          onOpenRenderStudio={() => setShowRenderModal(true)}
          onOpenExportModal={() => setShowExportModal(true)}
          onOpenBoqModal={() => setShowBoqModal(true)}
          onOpenMlopsModal={() => setShowMlopsModal(true)}
        />

        {/* Column 2: Responsive Editor Workspace */}
        <div
          ref={workspaceRef}
          data-testid="editor-workspace"
          data-workspace-mode={isDocked ? "docked" : "overlay"}
          className="flex flex-1 min-h-0 min-w-0 relative overflow-hidden"
        >
          {/* IN-FLOW DOCKED MODE (workspaceWidth >= 1024px) */}
          {isDocked && (
            <>
              {/* Left Contextual Dock (Properties or Catalog) */}
              {activeDrawer === 'properties' && <PropertiesPanel />}
              {activeDrawer === 'catalog' && <FurnitureCatalogDock />}

              {/* Central Dual Viewport (2D CAD Drafting or 3D WebGL PBR) */}
              <main
                aria-label="Architectural design viewport"
                className="flex-1 relative min-w-0 h-full overflow-hidden bg-slate-950"
              >
                {viewMode === '3d' ? <Viewport3D /> : <CanvasViewport />}
              </main>

              {/* Right Contextual Dock (Materials or AI Advisor) */}
              {activeDrawer === 'materials' && <MaterialsColorsDock />}
              {activeDrawer === 'ai' && <AIAdvisorPanel />}
            </>
          )}

          {/* OVERLAY MODE (workspaceWidth < 1024px) */}
          {!isDocked && (
            <>
              {/* Full Width Viewport */}
              <main
                aria-label="Architectural design viewport"
                className="flex-1 relative min-w-0 h-full overflow-hidden bg-slate-950"
              >
                {viewMode === '3d' ? <Viewport3D /> : <CanvasViewport />}
              </main>

              {/* Active Contextual Drawer Overlay */}
              {activeDrawer !== 'none' && (
                <>
                  {/* Backdrop to dismiss on tap */}
                  <div
                    data-testid="drawer-overlay-backdrop"
                    className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-20 cursor-pointer"
                    onClick={() => closeDrawer()}
                    aria-label="Close drawer backdrop"
                  />

                  {/* Left-anchored Overlay (Properties or Catalog) */}
                  {(activeDrawer === 'properties' || activeDrawer === 'catalog') && (
                    <div
                      data-testid="left-drawer-overlay"
                      className="absolute left-0 top-0 bottom-0 z-30 shadow-2xl animate-in slide-in-from-left duration-200"
                    >
                      {activeDrawer === 'properties' && <PropertiesPanel />}
                      {activeDrawer === 'catalog' && <FurnitureCatalogDock />}
                    </div>
                  )}

                  {/* Right-anchored Overlay (Materials or AI Advisor) */}
                  {(activeDrawer === 'materials' || activeDrawer === 'ai') && (
                    <div
                      data-testid="right-drawer-overlay"
                      className="absolute right-0 top-0 bottom-0 z-30 shadow-2xl animate-in slide-in-from-right duration-200"
                    >
                      {activeDrawer === 'materials' && <MaterialsColorsDock />}
                      {activeDrawer === 'ai' && <AIAdvisorPanel />}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. Bottom Real-Time 2D/3D Sync & Feature Highlights Strip */}
      <BottomFeatureStrip
        onOpenRenderStudio={() => setShowRenderModal(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenBoqModal={() => setShowBoqModal(true)}
      />

      {/* Workflow Modals */}
      <FloorPlanConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
      />

      <BOQEstimatorModal
        project={currentProject}
        isOpen={showBoqModal}
        onClose={() => setShowBoqModal(false)}
      />

      <PermittingSheetsModal
        project={currentProject}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <AIRenderStudioModal
        project={currentProject}
        isOpen={showRenderModal}
        onClose={() => setShowRenderModal(false)}
        webglCanvas={null}
        floorFinish="teak_hardwood"
        wallFinish="white_plaster"
        currentRoomName={null}
      />

      <MLOpsPipelineModal
        isOpen={showMlopsModal}
        onClose={() => setShowMlopsModal(false)}
      />
    </div>
  );
}
