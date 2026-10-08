import { ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";

const scopeItems = [
  "Interactive 2D vector CAD floor planning and space allocation",
  "Parametric multi-floor duplex vertical coordination and stair clearance",
  "Automated pre-construction heuristic auditing (IBC / NBC guidelines)",
  "Real-time Three.js WebGL spatial volume visualization & cutaways",
];

const boundaryItems = [
  "Not a substitute for stamp-certified architectural blueprints or municipal submission drawings",
  "Does not execute finite-element structural load calculations, soil bearing, or seismic engineering",
  "Not a certified fire protection engineering calculation or life-safety signoff",
  "All designs must be verified and sealed by a registered architect or structural engineer before construction",
];

/**
 * Architectural Advisory & Professional Regulatory Scope
 * Premium, agency-grade legal & safety disclaimer.
 */
export function SafetyDisclaimer() {
  return (
    <section id="safety" className="bg-[#090d16] border-b border-slate-800 py-20 lg:py-24 text-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 sm:p-10 backdrop-blur-sm">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Professional Practice Advisory & Regulatory Boundary
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  ARCHITECTURAL SCOPE SPECIFICATION // LEGAL DISCLOSURE
                </p>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                STATUTORY NOTICE
              </span>
            </div>
          </div>

          {/* Content Breakdown */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* System Scope */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                SYSTEM SCOPE & CAPABILITIES
              </div>
              <ul className="space-y-3">
                {scopeItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Statutory Boundaries */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                STATUTORY BOUNDARIES & REQUIREMENTS
              </div>
              <ul className="space-y-3">
                {boundaryItems.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mandatory Consulting Clause */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Mandatory Review:</strong> HomeAI Designer operates as an intelligent 
            pre-design modeling and conceptual spatial engine. Always submit final plans to a locally registered 
            architect, structural engineer, and municipal building authority for statutory approval, structural reinforcement 
            sizing, and soil testing prior to breaking ground.
          </div>
        </div>
      </div>
    </section>
  );
}
