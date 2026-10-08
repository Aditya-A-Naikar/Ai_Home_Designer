"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Plus, Search, Sparkles, FolderOpen, Upload, Home } from "lucide-react";
import { Project } from "@/core/domain/types";
import { projectRepository } from "@/infrastructure/persistence/local-storage-project-repository";
import { getMyHomeProject } from "@/core/domain/demo-project";
import { parseProjectJson } from "@/core/export/json-exporter";
import { ProjectCard } from "./project-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your residential floor plans and architectural design workspaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadMyHome} className="border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100">
            <Home className="h-4 w-4 text-indigo-600" />
            Open &quot;My Home&quot;
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoadDemo}>
            <Sparkles className="h-4 w-4 text-amber-600" />
            Sample Villa
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100">
            <Upload className="h-4 w-4 text-emerald-600" />
            Import (.json)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.homeai.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and counters */}
      {projects.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter projects by title..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredProjects.length} of {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
      )}

      {/* Content Grid / Empty state */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-slate-200 bg-white p-6 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center px-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No home designs created yet</h2>
          <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
            Start fresh by creating your own floor plan or load our curated sample villa concept.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="md" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Create New Project
              </Link>
            </Button>
            <Button variant="outline" size="md" onClick={handleLoadDemo}>
              <Sparkles className="h-4 w-4" />
              Explore Sample Project
            </Button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          No projects matched &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
