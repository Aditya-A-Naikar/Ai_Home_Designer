import {
  Layers3,
  Ruler,
  ShieldCheck,
  Box,
  GitBranch,
  FileText,
  CheckCircle2,
} from "lucide-react";

/**
 * Editorial Architectural Bento Grid
 * Replaces generic AI card grids with a technical CAD/BIM architectural capability showcase.
 */
export function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-900 text-slate-100 py-24 lg:py-32 border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Technical Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Comprehensive Architectural Features
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Built for architectural logic, not speculative images.
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Every room, wall, door, and stair is backed by a deterministic BIM geometry model
            computed to millimeter accuracy.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Large Bento (2 cols) - Parametric Duplex Core */}
          <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-xs font-medium text-cyan-300">
                  <Layers3 className="h-3.5 w-3.5 text-cyan-400" />
                  Multi-Floor Duplex Design
                </span>
                <span className="text-xs text-slate-400 font-medium">Vertical Stacking</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">
                Multi-Level Vertical Coordination with Void Mezzanines
              </h3>
              <p className="mt-2 text-sm text-slate-400 max-w-xl leading-relaxed">
                Stack Ground and First floor blueprints with coordinated stairwells. 
                Configure dog-legged or straight stairs, compute riser/tread counts to target floor heights (3.0m),
                and cut double-height voids into upper slabs with safety balustrades.
              </p>
            </div>

            {/* Architectural Section Diagram */}
            <div className="mt-8 rounded-lg bg-slate-900 border border-slate-800/80 p-4 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2 mb-3">
                <span className="text-cyan-400 font-semibold">CROSS-SECTION SCHEMATIC // ELEVATION</span>
                <span>DATUM: +0.00m FINISH FLOOR</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-300 font-bold">LEVEL 1</span>
                    <span className="text-slate-400">Upper Living & Master Suite (Void Cutout)</span>
                  </div>
                  <span className="text-slate-300 font-semibold">+3.00 m</span>
                </div>
                {/* Stair connector visual */}
                <div className="pl-6 py-1 flex items-center gap-3 text-[11px] text-slate-500">
                  <div className="h-4 w-px bg-slate-700 ml-2" />
                  <span>Dog-leg Staircase: 18 Risers @ 166.7mm • Clear Headroom 2,150mm</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-800/50 border border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-300 font-bold">LEVEL 0</span>
                    <span className="text-slate-400">Ground Living, Foyer, Kitchen & Porch</span>
                  </div>
                  <span className="text-slate-300 font-semibold">±0.00 m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Deterministic Geometry Kernel (1 col) */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between group hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-cyan-300">
                <Ruler className="h-3.5 w-3.5 text-cyan-400" />
                MILLIMETER PRECISION
              </span>
              <h3 className="mt-4 text-xl font-bold text-white">
                Deterministic CAD Framing
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Walls feature discrete structural core thicknesses (240mm masonry external, 120mm interior partitions).
                Orthogonal angle locks and vertex snapping eliminate rounding drift.
              </p>
            </div>

            <div className="mt-6 p-3 rounded bg-slate-900 border border-slate-800 text-xs font-mono space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Unit Storage</span>
                <span className="text-slate-200">100% SI Millimeters</span>
              </div>
              <div className="flex justify-between">
                <span>Snapping Engine</span>
                <span className="text-emerald-400">Endpoints, Midpoints, Grids</span>
              </div>
              <div className="flex justify-between">
                <span>Host Anchors</span>
                <span className="text-cyan-400">Doors/Windows locked to wall vector</span>
              </div>
            </div>
          </div>

          {/* Card 3: Real-Time Regulatory Engine (1 col) */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between group hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                REGULATORY KERNEL
              </span>
              <h3 className="mt-4 text-xl font-bold text-white">
                IBC & NBC 2024 Audit Engine
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Continuous background auditing validates room dimensions, stair safety, and egress clearance
                against National Building Code standards.
              </p>
            </div>

            <div className="mt-6 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Egress Width (&gt;800mm)
                </span>
                <span>PASS</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Habitable Room Area (&gt;9.5m²)
                </span>
                <span>PASS</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Stair Riser Formula (2R + T)
                </span>
                <span>PASS</span>
              </div>
            </div>
          </div>

          {/* Card 4: Hardware-Accelerated 3D Sync (2 cols) */}
          <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between group hover:border-slate-700 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-cyan-300">
                  <Box className="h-3.5 w-3.5 text-cyan-400" />
                  HARDWARE WEBGL 3D
                </span>
                <span className="text-[11px] font-mono text-slate-500">60 FPS REAL-TIME SYNC</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">
                Coordinated 2D Floor Plan ↔ Real-Time Three.js 3D Viewport
              </h3>
              <p className="mt-2 text-sm text-slate-400 max-w-xl leading-relaxed">
                Every wall segment, door puncture, window void, and staircase in your 2D plan extrudes
                instantly into full 3D geometry. Switch to cutaway view (1.2m elevation) or inspect
                axonometric projections with one keystroke.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3 text-center font-mono text-xs">
              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 font-bold block">1.2m Cutaway</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Reveals interior floor layouts</span>
              </div>
              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 font-bold block">Orbit Controls</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Full 360° pan, pitch & zoom</span>
              </div>
              <div className="p-3 rounded bg-slate-900 border border-slate-800">
                <span className="text-cyan-400 font-bold block">Multi-Floor Stacking</span>
                <span className="text-[11px] text-slate-400 mt-1 block">Zero-gap floor slab alignment</span>
              </div>
            </div>
          </div>

          {/* Card 5: Audit-Gated Copilot (1 col) */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between group hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-indigo-400">
                <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                DETERMINISTIC COPILOT
              </span>
              <h3 className="mt-4 text-xl font-bold text-white">
                Audit-Gated Spatial AI
              </h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                The AI assistant proposes surgical JSON diffs — not blind edits. Inspect affected room
                polygons and approve before any wall or opening changes.
              </p>
            </div>

            <div className="mt-6 p-3 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              <div className="text-slate-300 font-semibold mb-1">PROPOSAL AUDIT DIFF</div>
              <div className="text-emerald-400">+ Add Partition [L0, X: 4200, Y: 1800]</div>
              <div className="text-cyan-400">~ Relocate Door D2 (Width: 900mm)</div>
              <div className="text-slate-500 mt-2">Status: Awaiting Architect Approval</div>
            </div>
          </div>

          {/* Card 6: Production Schematics & Export (2 cols) */}
          <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-slate-800 p-8 flex flex-col justify-between group hover:border-slate-700 transition-colors">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-amber-400">
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                PROFESSIONAL DELIVERABLES
              </span>
              <h3 className="mt-4 text-xl font-bold text-white">
                Vector Blueprints & Structured BIM Models
              </h3>
              <p className="mt-2 text-sm text-slate-400 max-w-xl leading-relaxed">
                Export comprehensive project data as versioned architectural JSON, dimensioned vector SVG blueprints, 
                and layer-separated schematics ready for licensed structural review.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-xs">
              <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Structured Schema v1.1 (.json)
              </span>
              <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Vector CAD (.svg)
              </span>
              <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Plot Setback Calculations
              </span>
              <span className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Room Schedule & Area Breakdown
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
