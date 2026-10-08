import { Check, X, ArrowRight, Cpu } from "lucide-react";

/**
 * Editorial Manifesto: Deterministic Engineering vs. Image Generation
 * Establishes the serious architectural engineering philosophy of HomeAI Designer.
 */
export function PhilosophySection() {
  return (
    <section id="how-it-works" className="bg-[#0b0f19] text-white py-24 lg:py-32 border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-400 mb-4">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            ENGINEERING MANIFESTO
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Why generative image models cannot design buildings.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">
            Diffusion models create visually appealing pixels, but real architecture requires 
            coordinate systems, structural load paths, and statutory clearances.
          </p>
        </div>

        {/* Side-by-side Comparison Grid */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Generative Image Generators */}
          <div className="rounded-xl border border-red-950/80 bg-red-950/20 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-red-900/40 pb-4 mb-6">
                <span className="font-mono text-xs text-red-400 uppercase tracking-widest font-semibold">
                  Generative Image AI (DALL-E / Midjourney)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/60">
                  UNBUILDABLE
                </span>
              </div>

              <ul className="space-y-4 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-red-400 mt-1 shrink-0" />
                  <span><strong>Zero spatial memory:</strong> Rooms and dimensions mutate randomly between prompts and views.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-red-400 mt-1 shrink-0" />
                  <span><strong>Impossible stairwells:</strong> Stairs terminate into solid slabs, lack headroom, or defy gravity.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-red-400 mt-1 shrink-0" />
                  <span><strong>No structural thicknesses:</strong> Walls are fuzzy lines without distinction between partition and shear masonry.</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-4 w-4 text-red-400 mt-1 shrink-0" />
                  <span><strong>No floor-to-floor registration:</strong> Ground floor walls do not align with upper level load points.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-red-900/40 text-xs font-mono text-red-400/90">
              Result: Pure artistic illustration. Unusable for construction or permitting.
            </div>
          </div>

          {/* Right: HomeAI Deterministic BIM Kernel */}
          <div className="rounded-xl border border-cyan-800/80 bg-slate-900/90 p-8 flex flex-col justify-between relative shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest font-semibold">
                  HomeAI Deterministic BIM Kernel
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  ENGINEERED
                </span>
              </div>

              <ul className="space-y-4 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-cyan-400 mt-1 shrink-0" />
                  <span><strong>Rigorous millimeter coordinate model:</strong> Every wall, door, and room maintains exact global coordinates.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-cyan-400 mt-1 shrink-0" />
                  <span><strong>Parametric stair calculus:</strong> Real risers (166mm), treads (280mm), landing clearances, and double-height slab voids.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-cyan-400 mt-1 shrink-0" />
                  <span><strong>Structural framing cores:</strong> Distinct 240mm load-bearing walls vs 120mm interior dry partitions.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-cyan-400 mt-1 shrink-0" />
                  <span><strong>Synchronized multi-floor BIM:</strong> L0 and L1 share common column axes, vertical shaft alignments, and structural grids.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 text-xs font-mono text-cyan-300">
              Result: Production-ready architectural blueprints backed by 3D geometry.
            </div>
          </div>
        </div>

        {/* 4-Step Engineering Pipeline */}
        <div className="mt-20 border-t border-slate-800 pt-16">
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
              THE HOMAI CAD PIPELINE
            </span>
            <h3 className="mt-2 text-2xl font-bold text-white">
              From Plot Boundary to Coordinated 3D Model
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                phase: "SITE & SETBACKS",
                title: "Plot Coordinate Frame",
                desc: "Define plot dimensions, road frontage, True-North azimuth, and statutory municipal setbacks.",
              },
              {
                step: "02",
                phase: "PARAMETRIC FRAMING",
                title: "2D Vector Drafting",
                desc: "Draw orthogonal walls, insert anchored doors and windows, and calculate internal room enclosures.",
              },
              {
                step: "03",
                phase: "CODE VERIFICATION",
                title: "Automated NBC / IBC Audit",
                desc: "Audit egress routes, stair riser-tread formulas, and natural lighting requirements in real-time.",
              },
              {
                step: "04",
                phase: "BIM EXTRUSION",
                title: "Synchronized 3D Viewport",
                desc: "Extrude multi-floor volumes, inspect floor cutaways at 1.2m, and review finishes in WebGL.",
              },
            ].map((item, i, arr) => (
              <div key={item.step} className="p-6 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-mono font-black text-cyan-400">{item.step}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{item.phase}</span>
                  </div>
                  <h4 className="text-base font-bold text-white">{item.title}</h4>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>

                {i < arr.length - 1 && (
                  <div className="mt-6 flex items-center gap-1 text-[11px] font-mono text-slate-500">
                    <span>Feeds Next Stage</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
