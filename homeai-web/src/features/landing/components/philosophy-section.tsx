import { ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Plan",
    description:
      "Start a project, set your plot dimensions, and draw your floor plan in the precise 2D workspace. Add rooms, walls, doors, and windows — all with real measurements.",
  },
  {
    step: "02",
    title: "Discuss",
    description:
      "Ask the AI design advisor about your layout. It understands your actual floor plan — not just generic advice — and responds with context-aware suggestions and trade-off explanations.",
  },
  {
    step: "03",
    title: "Modify",
    description:
      "Review each AI proposal. See exactly which parts of your plan are affected before agreeing to any change. You decide what gets applied. The AI never modifies your design without your approval.",
  },
  {
    step: "04",
    title: "Visualize",
    description:
      "Once your 2D plan is approved, explore the same design in 3D — walls, rooms, and openings automatically translated from your plan. Walk through your concept before construction begins.",
  },
];

/**
 * Philosophy section explaining the core "Plan → Discuss → Modify → Visualize" workflow.
 */
export function PhilosophySection() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            You stay in control. The AI assists.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            HomeAI Designer follows a deliberate four-step workflow. Every design
            decision belongs to you.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, i) => (
            <div key={item.step} className="relative">
              {/* Connector arrow — only between steps on desktop */}
              {i < steps.length - 1 && (
                <div className="absolute right-0 top-7 hidden translate-x-1/2 lg:block" aria-hidden="true">
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              )}

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
                <span className="text-xl font-extrabold text-indigo-600">
                  {item.step}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
