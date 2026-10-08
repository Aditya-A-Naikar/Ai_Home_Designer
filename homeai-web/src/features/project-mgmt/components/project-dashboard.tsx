"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Plus, Search, FolderOpen, Upload, Home, Box, Layers, LayoutGrid, List } from "lucide-react";
import { Project } from "@/core/domain/types";
import { projectRepository } from "@/infrastructure/persistence/local-storage-project-repository";
import { getMyHomeProject } from "@/core/domain/demo-project";
import { parseProjectJson } from "@/core/export/json-exporter";
import { ProjectCard } from "./project-card";

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypology, setSelectedTypology] = useState<string>("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "table">("grid");
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const list = await projectRepository.getAll();
      setProjects(list);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects();
  }, []);

  const handleDuplicate = async (id: string) => {
    try {
      await projectRepository.duplicate(id);
      await loadProjects();
    } catch (err) {
      console.error("Failed to duplicate project:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    try {
      await projectRepository.delete(id);
      await loadProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  const handleLoadDemo = async () => {
    try {
      await projectRepository.seedDemo();
      await loadProjects();
    } catch (err) {
      console.error("Failed to seed demo:", err);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadMyHome = async () => {
    try {
      const myHome = getMyHomeProject();
      await projectRepository.save(myHome);
      await loadProjects();
    } catch (err) {
      console.error("Failed to load My Home:", err);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const parseResult = parseProjectJson(content);
      if (parseResult.success && parseResult.project) {
        await projectRepository.save(parseResult.project);
        await loadProjects();
        alert(`Successfully imported: "${parseResult.project.name}"`);
      } else {
        alert(`Failed to import project: ${parseResult.error || "Invalid file"}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTypology =
      selectedTypology === "all" ||
      p.typology === selectedTypology;
    return matchesSearch && matchesTypology;
  });

  const totalFloorsCount = projects.reduce((acc, p) => acc + p.floors.length, 0);
  const totalAreaSumM2 = Math.round(
    projects.reduce(
      (acc, p) => acc + (p.plotDimensions.width * p.plotDimensions.depth) / 1_000_000,
      0
    )
  );

  return (
    <div className="space-y-8">
      {/* Studio Header Bar */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            BIM PROJECT REPOSITORY
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
            Architectural Workspace
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Draft, inspect, and simulate residential floor plans across 2D CAD and 3D WebGL models.
          </p>
        </div>

        {/* Studio Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadMyHome}
            className="inline-flex items-center gap-1.5 rounded border border-cyan-800/80 bg-cyan-950/40 hover:bg-cyan-900/50 px-3 py-2 text-xs font-mono font-medium text-cyan-300 transition-colors"
          >
            <Home className="h-3.5 w-3.5 text-cyan-400" />
            <span>Open &quot;My Home&quot;</span>
          </button>

          <button
            type="button"
            onClick={handleLoadDemo}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-mono font-medium text-slate-300 transition-colors"
          >
            <Box className="h-3.5 w-3.5 text-amber-400" />
            <span>Sample Villa</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-mono font-medium text-slate-300 transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-400" />
            <span>Import (.json)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.homeai.json"
            onChange={handleImportFile}
            className="hidden"
          />

          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-mono font-bold text-slate-950 transition-all shadow-sm active:translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            <span>New CAD Project</span>
          </Link>
        </div>
      </div>

      {/* Studio Analytics Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Projects</span>
          <span className="text-lg font-bold text-white mt-1 block">{projects.length}</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Levels</span>
          <span className="text-lg font-bold text-cyan-400 mt-1 block">{totalFloorsCount} Floors</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Modeled Area</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">{totalAreaSumM2} m²</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Schema Specification</span>
          <span className="text-lg font-bold text-indigo-300 mt-1 block">BIM v1.1 JSON</span>
        </div>
      </div>

      {/* Search, Typology Filters & View Layout Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects by title..."
            className="w-full rounded bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Typology Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-mono">
          {[
            { id: "all", label: "All" },
            { id: "duplex_vertical", label: "Duplex" },
            { id: "villa", label: "Villa" },
            { id: "single_family", label: "Single-Family" },
            { id: "townhouse", label: "Townhouse" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTypology(tab.id)}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                selectedTypology === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Layout Switcher (Grid vs Table) */}
        <div className="hidden sm:flex items-center rounded border border-slate-800 bg-slate-900 p-0.5">
          <button
            type="button"
            onClick={() => setViewLayout("grid")}
            className={`p-1.5 rounded transition-colors ${
              viewLayout === "grid" ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewLayout("table")}
            className={`p-1.5 rounded transition-colors ${
              viewLayout === "table" ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
            title="Dense Table View"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0a0f18] py-20 text-center px-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 mb-4">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white font-mono">No CAD projects found in workspace</h2>
          <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Create a new residential blueprint from scratch or initialize our sample Duplex Villa model.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 rounded bg-cyan-500 hover:bg-cyan-400 px-5 py-2.5 text-xs font-mono font-bold text-slate-950 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </Link>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-mono font-semibold text-slate-300 transition-colors"
            >
              <Box className="h-4 w-4 text-cyan-400" />
              <span>Explore Sample Villa</span>
            </button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center text-xs font-mono text-slate-400">
          No architectural projects matched your query &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : viewLayout === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* Dense Architectural Table View */
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0c121e]">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#080d16] text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3.5">Project Title</th>
                <th className="p-3.5">Typology</th>
                <th className="p-3.5">Dimensions</th>
                <th className="p-3.5">Levels</th>
                <th className="p-3.5">Elements</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredProjects.map((p) => {
                const totalRooms = p.floors.reduce((acc, f) => acc + f.rooms.length, 0);
                const totalWalls = p.floors.reduce((acc, f) => acc + f.walls.length, 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5">
                      <Link href={`/editor/${p.id}`} className="font-bold text-white hover:text-cyan-400">
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-3.5 text-emerald-400 uppercase">
                      {(p.typology || "single_family").replace(/_/g, " ")}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {p.plotDimensions.width / 1000}m × {p.plotDimensions.depth / 1000}m
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 text-cyan-300">
                        <Layers className="h-3 w-3" />
                        {p.floors.length}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {totalWalls} walls • {totalRooms} rooms
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/editor/${p.id}`}
                          className="px-2.5 py-1 rounded bg-cyan-950 border border-cyan-800/80 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
                        >
                          2D Plan
                        </Link>
                        <Link
                          href={`/editor/${p.id}?view=3d`}
                          className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                          3D Model
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
