"use client";

import React, { useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { useCanvasStore } from "@/store/canvas-store";
import { 
  validateBlueprintFile, 
  createBlueprintUnderlay 
} from "@/core/geometry/blueprint-underlay";
import { blueprintAssetStore } from "@/infrastructure/storage/blueprint-asset-store";
import { 
  Upload, 
  Ruler, 
  Eye, 
  EyeOff, 
  Trash2, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface BlueprintDockProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlueprintDock({ isOpen, onClose }: BlueprintDockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { currentProject, setBlueprintUnderlay, updateBlueprintUnderlay, removeBlueprintUnderlay } = useProjectStore();
  const { tool, setTool } = useCanvasStore();

  if (!isOpen || !currentProject) return null;

  const activeFloor = currentProject.floors.find(f => f.id === currentProject.activeFloorId) || currentProject.floors[0];
  const underlay = activeFloor?.blueprintUnderlay;

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    const validation = validateBlueprintFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid blueprint file.");
      return;
    }

    setIsUploading(true);

    try {
      // Create an image object to extract physical pixel dimensions
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not decode image data."));
        img.src = objectUrl;
      });

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (width <= 0 || height <= 0) {
        throw new Error("Invalid image dimensions detected.");
      }

      // Persist blob in safe asset store
      const assetUrl = await blueprintAssetStore.saveAsset(file.name, file);

      // Default scale: 1 px = 10 mm (e.g. 2000px image = 20m)
      const newUnderlay = createBlueprintUnderlay({
        floorId: activeFloor.id,
        fileName: file.name,
        fileType: file.type || "image/png",
        fileSizeBytes: file.size,
        imageUrl: assetUrl,
        imageWidth: width,
        imageHeight: height,
        initialPositionMm: { x: 0, y: 0 },
        initialMmPerPixel: 10,
        opacity: 0.5,
      });

      setBlueprintUnderlay(activeFloor.id, newUnderlay);
      setIsUploading(false);
    } catch (err) {
      console.error("Blueprint import failure:", err);
      setErrorMsg((err as Error).message || "Failed to load blueprint file.");
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  return (
    <div className="absolute top-16 right-4 z-30 w-84 rounded-xl border border-slate-700 bg-slate-950/95 backdrop-blur-md p-4 shadow-2xl text-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <FileText className="h-4 w-4" />
          <span>BLUEPRINT UNDERLAY</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload Zone / Underlay Status */}
      {!underlay ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-cyan-400 bg-cyan-950/40"
              : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-2.5 rounded-full bg-slate-800 text-cyan-400">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-white text-xs">Import Floor Plan Image</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                PNG, JPG, WEBP, or PDF • Max 25 MB
              </p>
            </div>
            <span className="text-[10px] text-cyan-400 font-medium">Click or Drag & Drop</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Underlay Metadata Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-cyan-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate text-xs">{underlay.fileName}</p>
                <p className="text-[10px] text-slate-400">
                  {underlay.imageWidth} × {underlay.imageHeight} px •{" "}
                  {(underlay.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Calibrated Scale:</span>
              <span className="font-mono text-cyan-300 font-bold">
                1 px = {underlay.mmPerPixel.toFixed(2)} mm
              </span>
            </div>

            {underlay.calibration && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>Calibrated ({Math.round(underlay.calibration.realDistanceMm)} mm reference)</span>
              </div>
            )}
          </div>

          {/* Action: Calibrate Scale */}
          <button
            onClick={() => {
              setTool("calibrate");
              onClose();
            }}
            className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition-colors shadow-lg ${
              tool === "calibrate"
                ? "bg-cyan-500 text-white"
                : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40"
            }`}
          >
            <Ruler className="h-4 w-4" />
            <span>Calibrate Scale (2 Points)</span>
          </button>

          {/* Opacity Control */}
          <div className="space-y-1 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Underlay Opacity:</span>
              <span className="text-white font-mono">{Math.round(underlay.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={underlay.opacity}
              onChange={(e) =>
                updateBlueprintUnderlay(activeFloor.id, {
                  opacity: parseFloat(e.target.value),
                })
              }
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            {/* Quick Opacity Presets */}
            <div className="flex gap-1 pt-1">
              {[0.25, 0.5, 0.75, 1.0].map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    updateBlueprintUnderlay(activeFloor.id, {
                      opacity: preset,
                    })
                  }
                  className={`flex-1 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    Math.abs(underlay.opacity - preset) < 0.04
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                  data-testid={`opacity-preset-${Math.round(preset * 100)}`}
                >
                  {Math.round(preset * 100)}%
                </button>
              ))}
            </div>
            {underlay.calibration && (
              <button
                onClick={() =>
                  updateBlueprintUnderlay(activeFloor.id, {
                    mmPerPixel: 10,
                    calibration: undefined,
                  })
                }
                className="w-full pt-1.5 text-[10px] text-slate-400 hover:text-rose-400 text-center transition-colors cursor-pointer"
                data-testid="reset-scale-default-btn"
              >
                Reset Scale to Default (10 mm/px)
              </button>
            )}
          </div>

          {/* Visibility and Remove Controls */}
          <div className="flex gap-2">
            <button
              onClick={() =>
                updateBlueprintUnderlay(activeFloor.id, {
                  visible: !underlay.visible,
                })
              }
              className={`flex-1 py-1.5 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                underlay.visible
                  ? "border-slate-700 bg-slate-900 text-slate-200 hover:text-white"
                  : "border-amber-800/60 bg-amber-950/40 text-amber-300"
              }`}
            >
              {underlay.visible ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Visible</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                  <span>Hidden</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                blueprintAssetStore.deleteAsset(underlay.fileName);
                removeBlueprintUnderlay(activeFloor.id);
              }}
              className="py-1.5 px-3 rounded-lg border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
              title="Remove Underlay"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isUploading && (
        <div className="text-center py-2 text-cyan-400 text-xs animate-pulse">
          Processing and decoding blueprint image...
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-start gap-2 bg-rose-950/40 border border-rose-900/50 text-rose-300 p-2.5 rounded-lg text-[11px]">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
