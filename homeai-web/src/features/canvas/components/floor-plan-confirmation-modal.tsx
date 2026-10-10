"use client";

import React, { useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useCanvasStore } from '@/store/canvas-store';
import { validateFloorPlan, calculatePolygonAreaSqM, ValidationReport } from '@/core/geometry/floor-plan-validator';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Unlock, 
  ArrowRight, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloorPlanConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FloorPlanConfirmationModal({ isOpen, onClose }: FloorPlanConfirmationModalProps) {
  const { currentProject, confirmFloorPlan, reopenFloorPlanForEditing } = useProjectStore();
  const { setViewMode, toggleAIAdvisor } = useCanvasStore();
  const [activeTab, setActiveTab] = useState<'summary' | 'validation'>('summary');

  if (!isOpen || !currentProject) return null;

  const activeFloor = currentProject.floors.find(f => f.id === currentProject.activeFloorId) || currentProject.floors[0];
  if (!activeFloor) return null;

  const report: ValidationReport = validateFloorPlan(activeFloor);
  const isConfirmed = currentProject.floorPlanStatus === 'confirmed';

  const handleConfirm = () => {
    confirmFloorPlan();
    setViewMode('3d');
    onClose();
  };

  const handleReopen = () => {
    if (confirm('Reopening the floor plan allows you to edit structural walls and room boundaries. Continue?')) {
      reopenFloorPlanForEditing();
      setViewMode('2d');
      onClose();
    }
  };

  const handleAskAi = () => {
    toggleAIAdvisor();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {isConfirmed ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {isConfirmed ? 'Structural Floor Plan Baseline' : 'Stage 3: Review & Confirm Floor Plan'}
                </h2>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  isConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isConfirmed ? 'Baseline Locked (v1)' : 'Draft Review'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isConfirmed 
                  ? 'Structural walls are locked. Customize 3D finishes, furniture, and lighting freely.' 
                  : 'Review room boundaries, dimensions, and building code before proceeding to 3D.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-white gap-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'summary' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Layout Summary & Metrics
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'validation' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Automated Code Validation</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              report.score >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {report.score}/100
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'summary' && (
            <>
              {/* Quick Key Stats Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Usable Area</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5">{report.totalAreaSqM} m²</span>
                  <span className="text-[10px] text-slate-400">~{Math.round(report.totalAreaSqM * 10.764)} sq ft</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Rooms Defined</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5">{activeFloor.rooms.length}</span>
                  <span className="text-[10px] text-slate-400">{report.habitableRoomCount} habitable</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Openings</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5">{report.doorCount + report.windowCount}</span>
                  <span className="text-[10px] text-slate-400">{report.doorCount} doors, {report.windowCount} win</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col">
                  <span className="text-[10px] text-slate-500 font-medium">Validation</span>
                  <span className={`text-lg font-bold mt-0.5 ${report.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {report.score}%
                  </span>
                  <span className="text-[10px] text-slate-400">{report.passed ? 'Code Compliant' : 'Needs Review'}</span>
                </div>
              </div>

              {/* Room Schedule Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700">Room Schedule ({activeFloor.name})</span>
                  <span className="text-[10px] text-slate-500">{activeFloor.rooms.length} Enclosed Spaces</span>
                </div>
                {activeFloor.rooms.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No rooms generated yet. Use the <strong>Room (R)</strong> tool or let AI propose a layout.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {activeFloor.rooms.map((r, i) => {
                      const area = calculatePolygonAreaSqM(r.polygon);
                      return (
                        <div key={r.id || i} className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50/50">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3 h-3 rounded-full border border-slate-300 shrink-0" 
                              style={{ backgroundColor: r.color || '#3b82f6' }} 
                            />
                            <span className="font-medium text-slate-800">{r.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-slate-500">
                            <span>{area.toFixed(1)} m²</span>
                            <span className="text-[11px] text-slate-400">({Math.round(area * 10.764)} sqft)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Baseline Explanation Card */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex gap-3 items-start">
                <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-indigo-900">What does confirming do?</p>
                  <p className="text-indigo-800/80 leading-relaxed">
                    Confirming captures your structural layout as a versioned baseline. In 3D Studio, you can place furniture, customize wall paints, change marble/hardwood flooring, and tour the home in first-person walkthrough without accidentally moving load-bearing walls.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-4">
              {/* Score header */}
              <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                report.passed 
                  ? 'bg-emerald-50/60 border-emerald-200' 
                  : 'bg-amber-50/60 border-amber-200'
              }`}>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl font-black ${
                  report.passed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {report.score}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    {report.passed ? 'Residential Standards Satisfied' : 'Layout Advisory Items Found'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">{report.summary}</p>
                </div>
              </div>

              {/* Issues list */}
              <div className="space-y-2">
                {report.issues.length === 0 ? (
                  <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    <span className="font-semibold text-sm">Perfect Architectural Alignment!</span>
                    <span>No circulation, ingress, or code clearance issues detected.</span>
                  </div>
                ) : (
                  report.issues.map((issue) => (
                    <div 
                      key={issue.id} 
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        issue.type === 'error' 
                          ? 'bg-rose-50/60 border-rose-200 text-rose-900' 
                          : issue.type === 'warning'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-sky-50/60 border-sky-200 text-sky-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {issue.type === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />}
                        {issue.type === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        {issue.type === 'info' && <ShieldCheck className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
                        <span>{issue.title}</span>
                      </div>
                      <p className="opacity-90">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="text-[11px] opacity-75 font-medium pt-0.5">
                          💡 Suggestion: {issue.suggestion}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAskAi}
              className="text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Ask AI to Improve</span>
            </Button>

            {isConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReopen}
                className="text-xs text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100 flex items-center gap-1.5"
              >
                <Unlock className="h-3.5 w-3.5 text-amber-600" />
                <span>Reopen Floor Plan</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Stay in 2D
            </Button>

            {!isConfirmed ? (
              <Button
                size="sm"
                onClick={handleConfirm}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Confirm & Enter 3D Studio</span>
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setViewMode('3d');
                  onClose();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 flex items-center gap-1.5 shadow-sm"
              >
                <span>Enter 3D Customization Studio</span>
                <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Clean floating bar rendered above the 2D CAD canvas when in 2D mode,
 * letting the user clearly see the baseline state and trigger validation or confirmation.
 */
export function FloorPlanStatusBar({ onOpenModal }: { onOpenModal: () => void }) {
  const { currentProject } = useProjectStore();
  const { setViewMode, toggleAIAdvisor } = useCanvasStore();

  if (!currentProject) return null;
  const isConfirmed = currentProject.floorPlanStatus === 'confirmed';
  const activeFloor = currentProject.floors.find(f => f.id === currentProject.activeFloorId);
  const roomCount = activeFloor?.rooms.length || 0;
  const wallCount = activeFloor?.walls.length || 0;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md px-3 py-1.5 rounded-full text-xs animate-in slide-in-from-top-2 duration-200">
      <button 
        onClick={onOpenModal}
        className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className={`w-2 h-2 rounded-full ${isConfirmed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        <span className="font-semibold text-slate-800">
          {isConfirmed ? 'Baseline Locked (v1)' : 'Stage 3: Review Floor Plan'}
        </span>
        <span className="text-[11px] text-slate-400">
          ({roomCount} rms, {wallCount} walls)
        </span>
      </button>

      <button
        onClick={onOpenModal}
        className="px-2 py-0.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer text-[11px] font-medium"
      >
        Validate
      </button>

      <button
        onClick={toggleAIAdvisor}
        className="px-2 py-0.5 text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1"
      >
        <Sparkles className="h-3 w-3 text-indigo-600" />
        <span>Ask AI</span>
      </button>

      {!isConfirmed ? (
        <button
          onClick={onOpenModal}
          className="ml-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs transition-all cursor-pointer"
        >
          <span>Confirm & 3D</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <button
          onClick={() => setViewMode('3d')}
          className="ml-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs transition-all cursor-pointer"
        >
          <span>Enter 3D</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
