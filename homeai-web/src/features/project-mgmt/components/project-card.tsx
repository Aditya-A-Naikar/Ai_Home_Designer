"use client";

import Link from "next/link";
import { Copy, Layers, Pencil, Trash2 } from "lucide-react";
import { Project } from "@/core/domain/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDimension } from "@/core/units/converter";

interface ProjectCardProps {
  project: Project;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDuplicate, onDelete }: ProjectCardProps) {
  const formattedWidth = formatDimension(
    project.plotDimensions.width,
    project.settings.preferredUnit
  );
  const formattedDepth = formatDimension(
    project.plotDimensions.depth,
    project.settings.preferredUnit
  );

  const updatedDate = new Date(project.metadata.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalRooms = project.floors.reduce((acc, f) => acc + f.rooms.length, 0);
  const totalWalls = project.floors.reduce((acc, f) => acc + f.walls.length, 0);

  return (
    <Card hover className="flex flex-col justify-between overflow-hidden">
      <CardContent className="p-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/editor/${project.id}`}
              className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
            >
              {project.name}
            </Link>
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
              {project.metadata.description || "No description provided."}
            </p>
          </div>
          <Badge variant="default" className="capitalize shrink-0">
            {project.preferences.style.replace("_", " ")}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
          <div>
            <span className="text-slate-400 block">Plot Dimensions</span>
            <span className="font-semibold text-slate-800">
              {formattedWidth} × {formattedDepth}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Levels</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Layers className="h-3 w-3 text-indigo-500" />
              {project.floors.length} {project.floors.length === 1 ? "Floor" : "Floors"}
            </span>
          </div>
        </div>

        {/* Entities Summary */}
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <span>{totalRooms} {totalRooms === 1 ? "room" : "rooms"}</span>
          <span>•</span>
          <span>{totalWalls} {totalWalls === 1 ? "wall" : "walls"}</span>
          <span>•</span>
          <span>Updated {updatedDate}</span>
        </div>
      </CardContent>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
        <Link
          href={`/editor/${project.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <Pencil className="h-3.5 w-3.5" />
          Open Plan
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicate(project.id)}
            title="Duplicate project"
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Duplicate project"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            title="Delete project"
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
