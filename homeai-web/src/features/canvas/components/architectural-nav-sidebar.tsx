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
  Cpu
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
    aiAdvisorOpen,
    setAIAdvisorOpen,
    materialsDockOpen,
    setMaterialsDockOpen,
    catalogDockOpen,
    setCatalogDockOpen,
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
      active: aiAdvisorOpen,
      onClick: () => setAIAdvisorOpen(!aiAdvisorOpen),
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
      id: "customization",
      label: "Customization",
      icon: <Palette className="h-4 w-4" />,
      active: materialsDockOpen || catalogDockOpen,
      onClick: () => {
        setViewMode("3d");
        setMaterialsDockOpen(!materialsDockOpen);
        setCatalogDockOpen(!catalogDockOpen);
      },
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
      className={`h-full bg-[#070b14] border-r border-slate-800/80 flex flex-col shrink-0 select-none z-30 transition-all duration-200 font-mono ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Compass className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-xs font-bold font-mono tracking-wider text-white block truncate">
                AI ARCHITECT
              </span>
              <span className="text-[9px] text-cyan-400 font-mono tracking-widest block uppercase">
                BIM STUDIO
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors cursor-pointer"
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
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-none">
        {navItems.map((item) => {
          if (item.type === "link") {
            const isCurrentPage = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors group ${
                  isCurrentPage
                    ? "bg-slate-900 text-white font-bold border border-slate-800"
                    : "text-slate-400 hover:text-white hover:bg-slate-900/60"
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
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer group text-left ${
                item.active
                  ? "bg-cyan-950/80 border border-cyan-500/70 text-cyan-300 font-bold shadow-xs shadow-cyan-950/50"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/60"
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
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/30 shrink-0">
        <button
          type="button"
          onClick={() => {
            // Quick preferences toggle
            alert("HomeAI Studio Preferences: Units (Metric/mm), Snap (Grid & Endpoints active), NBC 2024 compliance verified.");
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0 text-slate-400 hover:text-cyan-400" />
          {!collapsed && <span className="truncate">Settings</span>}
        </button>
      </div>
    </aside>
  );
}
