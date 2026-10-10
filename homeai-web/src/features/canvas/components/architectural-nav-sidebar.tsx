"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCanvasStore } from "@/store/canvas-store";
import { 
  Home, 
  PlusCircle, 
  FolderKanban, 
  Bot, 
  LayoutGrid, 
  Box, 
  Palette, 
  Footprints, 
  Camera, 
  Share2, 
  Calculator, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Compass,
  Cpu,
  SlidersHorizontal,
  Armchair
} from "lucide-react";

interface ArchitecturalNavSidebarProps {
  onOpenRenderStudio?: () => void;
  onOpenExportModal?: () => void;
  onOpenBoqModal?: () => void;
  onOpenMlopsModal?: () => void;
}

export function ArchitecturalNavSidebar({
  onOpenRenderStudio,
  onOpenExportModal,
  onOpenBoqModal,
  onOpenMlopsModal,
}: ArchitecturalNavSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const {
    viewMode,
    setViewMode,
    activeDrawer,
    toggleDrawer,
    walkthroughActive,
    setWalkthroughActive,
  } = useCanvasStore();

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="h-4 w-4" />,
      href: "/dashboard",
      type: "link" as const,
    },
    {
      id: "new_project",
      label: "New Project",
      icon: <PlusCircle className="h-4 w-4" />,
      href: "/projects/new",
      type: "link" as const,
    },
    {
      id: "my_projects",
      label: "My Projects",
      icon: <FolderKanban className="h-4 w-4" />,
      href: "/dashboard",
      type: "link" as const,
    },
    {
      id: "ai_chat",
      label: "AI Chat",
      icon: <Bot className="h-4 w-4" />,
      active: activeDrawer === "ai",
      onClick: () => toggleDrawer("ai"),
      type: "action" as const,
    },
    {
      id: "2d_floor_plan",
      label: "2D Floor Plan",
      icon: <LayoutGrid className="h-4 w-4" />,
      active: viewMode === "2d",
      onClick: () => {
        setViewMode("2d");
        setWalkthroughActive(false);
      },
      type: "action" as const,
    },
    {
      id: "3d_design",
      label: "3D Design",
      icon: <Box className="h-4 w-4" />,
      active: viewMode === "3d" && !walkthroughActive,
      onClick: () => {
        setViewMode("3d");
        setWalkthroughActive(false);
      },
      type: "action" as const,
    },
    {
      id: "catalog",
      label: "Furniture & Decor",
      icon: <Armchair className="h-4 w-4" />,
      active: activeDrawer === "catalog",
      onClick: () => toggleDrawer("catalog"),
      type: "action" as const,
    },
    {
      id: "materials",
      label: "Materials & Finishes",
      icon: <Palette className="h-4 w-4" />,
      active: activeDrawer === "materials",
      onClick: () => toggleDrawer("materials"),
      type: "action" as const,
    },
    {
      id: "properties",
      label: "Properties & Tools",
      icon: <SlidersHorizontal className="h-4 w-4" />,
      active: activeDrawer === "properties",
      onClick: () => toggleDrawer("properties"),
      type: "action" as const,
    },
    {
      id: "walkthrough",
      label: "Walkthrough",
      icon: <Footprints className="h-4 w-4" />,
      active: walkthroughActive,
      onClick: () => {
        setViewMode("3d");
        setWalkthroughActive(!walkthroughActive);
      },
      type: "action" as const,
    },
    {
      id: "renders",
      label: "Renders",
      icon: <Camera className="h-4 w-4" />,
      onClick: onOpenRenderStudio,
      type: "action" as const,
    },
    {
      id: "export",
      label: "Share & Export",
      icon: <Share2 className="h-4 w-4" />,
      onClick: onOpenExportModal,
      type: "action" as const,
    },
    {
      id: "boq",
      label: "BOQ Costs",
      icon: <Calculator className="h-4 w-4" />,
      onClick: onOpenBoqModal,
      type: "action" as const,
    },
    {
      id: "mlops_pipeline",
      label: "AI / ML Pipeline",
      icon: <Cpu className="h-4 w-4" />,
      onClick: onOpenMlopsModal,
      type: "action" as const,
    },
  ];

  return (
    <aside
      className={`h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none z-30 transition-all duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Brand Header */}
      <div className="h-12 border-b border-slate-800 px-3.5 flex items-center justify-between shrink-0 bg-slate-900/90">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-7 w-7 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Compass className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-xs font-bold tracking-tight text-white block truncate">
                HomeAI Designer
              </span>
              <span className="text-[10px] text-slate-400 font-medium block truncate">
                Architectural Studio
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 px-2 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          if (item.type === "link") {
            const isCurrentPage = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors group ${
                  isCurrentPage
                    ? "bg-slate-800 text-white font-medium border border-slate-700/60"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0 text-slate-400 group-hover:text-cyan-400 transition-colors">
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer group text-left ${
                item.active
                  ? "bg-cyan-950/70 border border-cyan-500/60 text-cyan-300 font-semibold shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span
                className={`shrink-0 transition-colors ${
                  item.active ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"
                }`}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Footer Settings Area */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/50 shrink-0">
        <button
          type="button"
          onClick={() => {
            alert("HomeAI Studio Preferences: Units (Metric/mm), Snap (Grid & Endpoints active), NBC 2024 compliance verified.");
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-400 hover:text-cyan-400" />
          {!collapsed && <span className="truncate">Settings</span>}
        </button>
      </div>
    </aside>
  );
}
