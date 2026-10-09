"use client";

import React, { useEffect, useState } from 'react';
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

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { loadProject, isLoading, error, currentProject, undo, redo, saveProject } = useProjectStore();
  const { 
    viewMode,
    setViewMode,
    setTool, 
    selectElement, 
    selectSubElement, 
    isModified,
    leftSidebarOpen 
  } = useCanvasStore();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [showBoqModal, setShowBoqModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMlopsModal, setShowMlopsModal] = useState(false);

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
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch(e.key.toLowerCase()) {
        case 'escape':
          setTool('select');
          selectElement(null);
          selectSubElement(null);
          break;
        case 'v': setTool('select'); break;
        case 'w': setTool('wall'); break;
        case 'r': setTool('room'); break;
        case 'd': setTool('door'); break;
        case 'h': setTool('pan'); break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) redo();
            else undo();
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redo();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            saveProject();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, selectElement, selectSubElement, undo, redo, saveProject]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-mono text-sm">Loading architectural workstation...</div>;
  }

  if (error || !currentProject) {
    return <div className="flex h-screen items-center justify-center bg-slate-950 text-rose-400 font-mono text-sm">Error: {error || 'Project not found'}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#080d1a] overflow-hidden select-none">
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
        {/* Column 1: Left Architectural Nav Sidebar */}
        <ArchitecturalNavSidebar
          onOpenRenderStudio={() => setShowRenderModal(true)}
          onOpenExportModal={() => setShowExportModal(true)}
          onOpenBoqModal={() => setShowBoqModal(true)}
          onOpenMlopsModal={() => setShowMlopsModal(true)}
        />

        {/* Column 2: Searchable Furniture & Decor Catalog Dock */}
        <FurnitureCatalogDock />

        {/* Optional 2D CAD Tool & Level Properties Drawer */}
        {viewMode === '2d' && leftSidebarOpen && <PropertiesPanel />}

        {/* Column 3: Central Dual Viewport (2D CAD Drafting or 3D WebGL PBR) */}
        <main aria-label="Architectural design viewport" className="flex-1 relative min-w-0 h-full overflow-hidden bg-slate-950">
          {viewMode === '3d' ? <Viewport3D /> : <CanvasViewport />}
        </main>

        {/* Column 4: Materials & Colors Swatches Dock */}
        <MaterialsColorsDock />

        {/* Column 5: AI Architect Co-Pilot Panel */}
        <AIAdvisorPanel />
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
