"use client";

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useProjectStore } from '@/store/project-store';
import { CanvasToolbar } from '@/features/canvas/components/canvas-toolbar';
import { PropertiesPanel } from '@/features/canvas/components/properties-panel';
import { CanvasViewport } from '@/features/canvas/components/canvas-viewport';
import { AIAdvisorPanel } from '@/features/ai-advisor/components/ai-advisor-panel';
import { useCanvasStore } from '@/store/canvas-store';
import { PanelLeft } from 'lucide-react';

export default function EditorPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { loadProject, isLoading, error, currentProject, undo, redo, saveProject } = useProjectStore();
  const { 
    setTool, 
    selectElement, 
    selectSubElement, 
    isModified,
    leftSidebarOpen,
    setLeftSidebarOpen 
  } = useCanvasStore();

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
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading project workspace...</div>;
  }

  if (error || !currentProject) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-red-500">Error: {error || 'Project not found'}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 overflow-hidden select-none">
      <CanvasToolbar />
      <div className="flex flex-1 min-h-0 w-full overflow-hidden relative">
        {leftSidebarOpen && <PropertiesPanel />}
        {!leftSidebarOpen && (
          <button
            onClick={() => setLeftSidebarOpen(true)}
            className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-lg shadow-md hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
            title="Open Tools & Properties Sidebar"
          >
            <PanelLeft className="h-4 w-4 text-indigo-600" />
            <span>Tools & Floors</span>
          </button>
        )}
        <div className="flex-1 relative min-w-0 h-full overflow-hidden">
          <CanvasViewport />
        </div>
        <AIAdvisorPanel />
      </div>
    </div>
  );
}
