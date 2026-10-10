"use client";

import React, { useState, useEffect, useRef } from "react";
import { Project } from "@/core/domain/types";
import { FloorFinishType, WallFinishType } from "@/core/geometry/pbr-materials";
import { 
  synthesizePhotorealisticPrompt, 
  applyCinematicPostProcess, 
  RenderAestheticStyle, 
  LightingMood 
} from "@/core/ai/photorealism-engine";
import { 
  X, 
  Camera, 
  Copy, 
  Check, 
  Download
} from "lucide-react";

interface AIRenderStudioModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  webglCanvas: HTMLCanvasElement | null;
  floorFinish: FloorFinishType;
  wallFinish: WallFinishType;
  currentRoomName: string | null;
}

export function AIRenderStudioModal({
  project,
  isOpen,
  onClose,
  webglCanvas,
  floorFinish,
  wallFinish,
  currentRoomName,
}: AIRenderStudioModalProps) {
  const [aesthetic, setAesthetic] = useState<RenderAestheticStyle>("architectural_digest");
  const [lighting, setLighting] = useState<LightingMood>("golden_hour");
  const [focalLength, setFocalLength] = useState<24 | 35 | 50>(35);
  const [twoPointPerspective, setTwoPointPerspective] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const roomName = currentRoomName || "Main Architectural Living Space";

  const promptPackage = React.useMemo(() => {
    return synthesizePhotorealisticPrompt(project, {
      aesthetic,
      lighting,
      roomName,
      floorFinish,
      wallFinish,
      focalLengthMm: focalLength,
      twoPointPerspective,
    });
  }, [project, aesthetic, lighting, roomName, floorFinish, wallFinish, focalLength, twoPointPerspective]);

  // Update canvas preview whenever lighting or source canvas changes
  useEffect(() => {
    if (!isOpen || !webglCanvas || !previewCanvasRef.current) return;
    applyCinematicPostProcess(webglCanvas, previewCanvasRef.current, lighting);
  }, [isOpen, webglCanvas, lighting]);

  if (!isOpen) return null;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptPackage.positivePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadRender = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}-ai-render.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-fuchsia-950/80 border border-fuchsia-700/60 flex items-center justify-center text-fuchsia-400">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Phase 16 • AI Studio Render Synthesizer</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-950 border border-fuchsia-700/50 text-fuchsia-300">
                  LUMEN 8K • READY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {roomName} • {project.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadRender}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Render (PNG)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Canvas Preview (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950 p-4 flex flex-col items-center justify-center relative border-r border-slate-800">
            <div className="relative w-full h-full flex items-center justify-center rounded-lg overflow-hidden border border-slate-800/80 bg-black/60 shadow-inner">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain rounded shadow-2xl"
              />

              {/* Watermark / Specs HUD */}
              <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 rounded text-[11px] font-mono text-slate-300 flex items-center gap-3">
                <span className="text-cyan-400 font-bold">{promptPackage.cameraSettings.lens}</span>
                <span>{promptPackage.cameraSettings.aperture}</span>
                <span>ISO {promptPackage.cameraSettings.iso}</span>
                <span className="text-amber-400 capitalize">{lighting.replace("_", " ")}</span>
              </div>
            </div>
          </div>

          {/* Right Parameters & Prompt Panel (5 cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between overflow-y-auto space-y-5 bg-slate-900/60">
            <div className="space-y-4">
              {/* Aesthetic Style Selector */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Architectural Aesthetic Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["architectural_digest", "Architectural Digest"],
                      ["scandinavian_minimalist", "Scandinavian Warmth"],
                      ["japandi_serenity", "Japandi Serenity"],
                      ["warm_brutalism", "Warm Brutalism"],
                      ["luxury_penthouse", "Luxury Penthouse"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setAesthetic(id)}
                      className={`px-3 py-2 text-left rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        aesthetic === id
                          ? "bg-fuchsia-950/70 border-fuchsia-500 text-fuchsia-200"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lighting Mood Selector */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Lighting & Atmospheric Mood
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["golden_hour", "Golden Hour (3200K)"],
                      ["crisp_noon", "Crisp High Noon (5600K)"],
                      ["blue_hour", "Blue Hour Twilight"],
                      ["moody_overcast", "Moody Overcast (Diffuse)"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setLighting(id)}
                      className={`px-3 py-2 text-left rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        lighting === id
                          ? "bg-amber-950/70 border-amber-500 text-amber-200"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Focal Length */}
              <div>
                <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Architectural Prime Lens
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 35, 50].map((mm) => (
                    <button
                      key={mm}
                      onClick={() => setFocalLength(mm as 24 | 35 | 50)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        focalLength === mm
                          ? "bg-cyan-950/70 border-cyan-500 text-cyan-200"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mm}mm Prime
                    </button>
                  ))}
                </div>
              </div>

              {/* Two-Point Perspective Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                <span className="text-xs text-slate-300 font-medium">Tilt-Shift Two-Point Perspective</span>
                <input
                  type="checkbox"
                  checked={twoPointPerspective}
                  onChange={(e) => setTwoPointPerspective(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                />
              </div>

              {/* Synthesized Master AI Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Synthesized Diffusion Prompt
                  </label>
                  <button
                    onClick={handleCopyPrompt}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied!" : "Copy Prompt"}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed max-h-36 overflow-y-auto select-all">
                  {promptPackage.positivePrompt}
                </div>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{promptPackage.materialDetails}</span>
              <span className="text-cyan-400">8K CINEMATIC RAW</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
