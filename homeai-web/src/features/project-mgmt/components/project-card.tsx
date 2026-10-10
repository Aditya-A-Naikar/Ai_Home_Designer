"use client";

import Link from "next/link";
import { Copy, Layers, Pencil, Trash2, Box, Compass } from "lucide-react";
import { Project } from "@/core/domain/types";
import { formatDimension, formatArea } from "@/core/units/converter";

interface ProjectCardProps {
  project: Project;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDuplicate, onDelete }: ProjectCardProps) {
  const preferredUnit = project.settings.preferredUnit;
  const formattedWidth = formatDimension(project.plotDimensions.width, preferredUnit);
  const formattedDepth = formatDimension(project.plotDimensions.depth, preferredUnit);
  const totalPlotAreaSqMm = project.plotDimensions.width * project.plotDimensions.depth;
  const formattedAreaStr = formatArea(totalPlotAreaSqMm, project.settings.unitSystem);

  const updatedDate = new Date(project.metadata.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalRooms = project.floors.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalWalls = project.floors.reduce((acc, f) => acc + f.walls.length, 0);
  const totalStairs = project.floors.reduce((acc, f) => acc + (f.stairs?.length || 0), 0);

  const firstFloor = project.floors[0];
  const plotW = Math.max(project.plotDimensions.width, 5000);
  const plotD = Math.max(project.plotDimensions.depth, 5000);

  const typologyLabel = (project.typology || "single_family")
    .replace(/_/g, " ")
    .toUpperCase();

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-[#0c121e] hover:border-cyan-500/50 transition-all duration-200 shadow-md hover:shadow-cyan-950/30">
      {/* Blueprint Mini CAD Viewport Header */}
      <div className="relative h-44 w-full bg-[#080d16] border-b border-slate-800/80 overflow-hidden flex items-center justify-center p-3 select-none">
        {/* Blueprint background grid */}
        <div className="absolute inset-0 bg-blueprint-lines opacity-20 pointer-events-none" />

        {/* CAD SVG Wireframe */}
        <div className="relative w-full h-full flex items-center justify-center">
          <svg
            viewBox={`-500 -500 ${plotW + 1000} ${plotD + 1000}`}
            className="w-full h-full max-h-36 object-contain"
          >
            {/* Plot Boundary */}
            <rect
              x={0}
              y={0}
              width={plotW}
              height={plotD}
              fill="#0f172a"
              fillOpacity={0.6}
              stroke="#38bdf8"
              strokeWidth={Math.max(plotW * 0.008, 40)}
              strokeDasharray={`${plotW * 0.02} ${plotW * 0.01}`}
            />

            {/* Render First Floor Walls */}
            {firstFloor?.walls?.map((w) => (
              <line
                key={w.id}
                x1={w.start.x}
                y1={w.start.y}
                x2={w.end.x}
                y2={w.end.y}
                stroke="#06b6d4"
                strokeWidth={Math.max(w.thickness || 150, plotW * 0.02)}
                strokeLinecap="round"
              />
            ))}

            {/* Render Stairs icon / bounding box if present */}
            {firstFloor?.stairs?.map((st) => (
              <rect
                key={st.id}
                x={st.position.x - (st.width || 1000) / 2}
                y={st.position.y - (st.length || 2400) / 2}
                width={st.width || 1000}
                height={st.length || 2400}
                fill="#d97706"
                fillOpacity={0.4}
                stroke="#fbbf24"
                strokeWidth={Math.max(plotW * 0.006, 30)}
              />
            ))}

            {/* Empty plot crosshair watermark if 0 walls */}
            {(!firstFloor?.walls || firstFloor.walls.length === 0) && (
              <>
                <line
                  x1={plotW * 0.2}
                  y1={plotD * 0.5}
                  x2={plotW * 0.8}
                  y2={plotD * 0.5}
                  stroke="#334155"
                  strokeWidth={plotW * 0.005}
                />
                <line
                  x1={plotW * 0.5}
                  y1={plotD * 0.2}
                  x2={plotW * 0.5}
                  y2={plotD * 0.8}
                  stroke="#334155"
                  strokeWidth={plotW * 0.005}
                />
              </>
            )}
          </svg>
        </div>

        {/* Blueprint Metadata Watermark Overlays */}
        <div className="absolute top-2 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono text-cyan-400">
          <Layers className="h-3 w-3 text-cyan-400" />
          <span>{project.floors.length} {project.floors.length === 1 ? "LEVEL" : "LEVELS"}</span>
        </div>

        <div className="absolute top-2 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-[10px] font-mono text-slate-300">
          <Compass className="h-3 w-3 text-cyan-400" />
          <span>{project.siteContext?.roadFacing || "N"}</span>
        </div>

        <div className="absolute bottom-2 left-2.5 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          {formattedWidth} × {formattedDepth} ({formattedAreaStr})
        </div>

        <div className="absolute bottom-2 right-2.5 text-[10px] font-mono font-semibold text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          {typologyLabel}
        </div>
      </div>

      {/* Project Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/editor/${project.id}`}
              className="text-base font-bold text-white hover:text-cyan-400 transition-colors line-clamp-1 tracking-tight"
            >
              {project.name}
            </Link>
          </div>

          <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {project.metadata.description || "Architectural residential floor plan workspace."}
          </p>
        </div>

        {/* CAD Specification Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Walls</span>
            <span className="font-bold text-slate-200">{totalWalls}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Rooms</span>
            <span className="font-bold text-slate-200">{totalRooms}</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Stairs</span>
            <span className="font-bold text-slate-200">{totalStairs}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Updated {updatedDate}</span>
          <span className="text-cyan-400/80 font-medium uppercase text-[11px]">{project.settings.preferredUnit.toUpperCase()} CAD</span>
        </div>
      </div>

      {/* Action Footer: 2D Blueprint + 3D Viewport Triggers */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-[#090d16] px-5 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/editor/${project.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Pencil className="h-3 w-3" />
            <span>2D Plan</span>
          </Link>
          <Link
            href={`/editor/${project.id}?view=3d`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            <Box className="h-3 w-3 text-cyan-400" />
            <span>3D Model</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(project.id)}
            title="Duplicate Project"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Duplicate Project"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            title="Delete Project"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-950/50 hover:text-red-400 transition-colors cursor-pointer"
            aria-label="Delete Project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
