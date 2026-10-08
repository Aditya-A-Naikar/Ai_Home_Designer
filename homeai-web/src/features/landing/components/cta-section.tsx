import Link from "next/link";
import { ArrowRight, Box, Compass } from "lucide-react";

/**
 * Technical Studio CTA Banner
 * Replaces generic solid indigo CTA with a sleek architectural workbench invitation.
 */
export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950 border-b border-slate-800 py-20 lg:py-28 text-white">
      {/* Background CAD Grid */}
      <div 
        className="absolute inset-0 bg-blueprint-lines opacity-10 pointer-events-none" 
        aria-hidden="true" 
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Monospace Metadata Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-cyan-400 mb-6">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>PARAMETRIC RESIDENTIAL WORKBENCH</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto">
          Start modeling your architectural floor plan today.
        </h2>

        <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Zero software installation. Draw load-bearing walls, configure duplex stairs, 
          run building code checks, and explore full 3D spatial volumes directly in your browser.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/projects/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md bg-cyan-500 hover:bg-cyan-400 px-7 py-3.5 text-sm font-semibold text-slate-950 transition-all shadow-sm hover:shadow-cyan-500/20 active:translate-y-0.5"
          >
            <span>Create New Project</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/projects/demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900/90 hover:bg-slate-800 px-7 py-3.5 text-sm font-semibold text-slate-200 transition-colors"
          >
            <Box className="h-4 w-4 text-cyan-400" />
            <span>Launch Sample Villa</span>
          </Link>
        </div>

        <p className="mt-6 text-[11px] font-mono text-slate-500">
          SYSTEM COMPLIANCE: IBC 2024 / NBC INDIA • METRIC & IMPERIAL CAD COMPATIBLE
        </p>
      </div>
    </section>
  );
}
