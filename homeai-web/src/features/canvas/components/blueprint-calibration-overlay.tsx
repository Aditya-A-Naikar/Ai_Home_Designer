"use client";

import React, { useState } from "react";
import { Point2D, BlueprintUnderlay } from "@/core/domain/types";
import { 
  CalibrationUnit, 
  unitToMm, 
  canvasMmToImagePixel, 
  recalibrateUnderlay 
} from "@/core/geometry/blueprint-underlay";
import { useProjectStore } from "@/store/project-store";
import { Check, RotateCcw, Ruler } from "lucide-react";

interface BlueprintCalibrationOverlayProps {
  activeFloorId: string;
  underlay: BlueprintUnderlay;
  zoom: number;
  point1Mm: Point2D | null;
  point2Mm: Point2D | null;
  cursorMm: Point2D | null;
  onResetPoints: () => void;
  onCancel: () => void;
  onComplete: () => void;
}

export function BlueprintCalibrationOverlay({
  activeFloorId,
  underlay,
  zoom,
  point1Mm,
  point2Mm,
  cursorMm,
  onResetPoints,
  onCancel,
  onComplete,
}: BlueprintCalibrationOverlayProps) {
  const { updateBlueprintUnderlay } = useProjectStore();

  const [inputDistance, setInputDistance] = useState("5000");
  const [selectedUnit, setSelectedUnit] = useState<CalibrationUnit>("mm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If both points are placed, calculate pixel distance for live preview
  let pixelDist = 0;
  let p1Px: Point2D | null = null;
  let p2Px: Point2D | null = null;

  if (point1Mm && point2Mm) {
    p1Px = canvasMmToImagePixel(point1Mm, underlay);
    p2Px = canvasMmToImagePixel(point2Mm, underlay);
    pixelDist = Math.hypot(p2Px.x - p1Px.x, p2Px.y - p1Px.y);
  }

  const numVal = parseFloat(inputDistance) || 0;
  const targetDistanceMm = unitToMm(numVal, selectedUnit);
  const previewScale = pixelDist > 0 && targetDistanceMm > 0 ? targetDistanceMm / pixelDist : 0;

  const handleApply = () => {
    if (!p1Px || !p2Px || pixelDist < 1.0) {
      setErrorMsg("Calibration points are too close together. Please pick two distinct points.");
      return;
    }

    if (!Number.isFinite(targetDistanceMm) || targetDistanceMm <= 0) {
      setErrorMsg("Please enter a valid positive distance measurement.");
      return;
    }

    const result = recalibrateUnderlay(underlay, p1Px, p2Px, targetDistanceMm);
    if (!result.success) {
      setErrorMsg(result.error || "Calibration calculation failed.");
      return;
    }

    updateBlueprintUnderlay(activeFloorId, result.underlay);
    onComplete();
  };

  return (
    <>
      {/* SVG Vector Visual Markers & Guide Line */}
      <g id="calibration-svg-overlay" pointerEvents="none">
        {/* Point 1 Marker */}
        {point1Mm && (
          <g transform={`translate(${point1Mm.x}, ${point1Mm.y})`}>
            <circle r={14 / zoom} fill="#0284c7" fillOpacity={0.25} />
            <circle r={6 / zoom} fill="#0284c7" stroke="#ffffff" strokeWidth={2 / zoom} />
            <circle r={2 / zoom} fill="#ffffff" />
            <g transform={`scale(${1 / zoom}) translate(0, -22)`}>
              <rect x={-32} y={-10} width={64} height={20} rx={4} fill="#0f172a" fillOpacity={0.9} />
              <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold">
                Point 1
              </text>
            </g>
          </g>
        )}

        {/* Dynamic Guide Line between Point 1 and cursor (or Point 2) */}
        {point1Mm && (point2Mm || cursorMm) && (
          <line
            x1={point1Mm.x}
            y1={point1Mm.y}
            x2={point2Mm ? point2Mm.x : cursorMm!.x}
            y2={point2Mm ? point2Mm.y : cursorMm!.y}
            stroke="#0284c7"
            strokeWidth={2 / zoom}
            strokeDasharray={point2Mm ? undefined : `${6 / zoom},${4 / zoom}`}
          />
        )}

        {/* Point 2 Marker */}
        {point2Mm && (
          <g transform={`translate(${point2Mm.x}, ${point2Mm.y})`}>
            <circle r={14 / zoom} fill="#10b981" fillOpacity={0.25} />
            <circle r={6 / zoom} fill="#10b981" stroke="#ffffff" strokeWidth={2 / zoom} />
            <circle r={2 / zoom} fill="#ffffff" />
            <g transform={`scale(${1 / zoom}) translate(0, -22)`}>
              <rect x={-32} y={-10} width={64} height={20} rx={4} fill="#0f172a" fillOpacity={0.9} />
              <text x={0} y={4} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight="bold">
                Point 2
              </text>
            </g>
          </g>
        )}
      </g>

      {/* Top Floating Calibration Instructions Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700 px-5 py-2.5 rounded-xl shadow-2xl text-xs text-white flex items-center gap-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <Ruler className="h-4 w-4" />
          <span>SCALE CALIBRATION</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-200">
          {!point1Mm
            ? "Step 1: Click first reference point on the blueprint."
            : !point2Mm
            ? "Step 2: Click second reference point along the known dimension."
            : "Points selected! Enter the real-world distance below."}
        </span>
        <div className="flex items-center gap-2">
          {point1Mm && (
            <button
              onClick={onResetPoints}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Reset Points"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onCancel}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Two-Point Distance Input Modal (Rendered when both points are clicked) */}
      {point1Mm && point2Mm && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-96 rounded-xl border border-slate-700 bg-slate-950/95 backdrop-blur-md p-5 shadow-2xl text-xs text-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white text-sm">Enter Known Distance</span>
            <span className="text-[11px] text-cyan-400 font-mono">
              Measured: {Math.round(pixelDist)} px
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400">Real-World Measurement:</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="any"
                value={inputDistance}
                onChange={(e) => {
                  setInputDistance(e.target.value);
                  setErrorMsg(null);
                }}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
                placeholder="e.g. 5000"
                autoFocus
              />
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value as CalibrationUnit)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
                <option value="ft">ft</option>
                <option value="in">in</option>
              </select>
            </div>
            {selectedUnit !== "mm" && (
              <span className="text-[10px] text-slate-400">
                Converted to canonical {Math.round(targetDistanceMm)} mm
              </span>
            )}
          </div>

          {previewScale > 0 && (
            <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Resulting Scale:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  1 px = {previewScale.toFixed(3)} mm
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Drawing Size:</span>
                <span className="font-mono text-slate-300">
                  {Math.round((underlay.imageWidth * previewScale) / 1000)}m ×{" "}
                  {Math.round((underlay.imageHeight * previewScale) / 1000)}m
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-rose-400 text-[11px] bg-rose-950/40 border border-rose-900/50 p-2 rounded">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium transition-colors border border-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-900/40"
            >
              <Check className="h-4 w-4" />
              <span>Apply Scale</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
