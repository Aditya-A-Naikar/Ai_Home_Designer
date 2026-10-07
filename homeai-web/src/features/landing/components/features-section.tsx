import {
  PencilRuler,
  MessageSquare,
  Layers3,
  ZoomIn,
  Undo2,
  FlipHorizontal,
  ShieldCheck,
  Save,
} from "lucide-react";

const features = [
  {
    icon: PencilRuler,
    title: "Precise 2D Floor Plans",
    description:
      "Draw walls, rooms, doors, and windows with real measurements. Internal units are deterministic — your 10-foot room is always exactly 10 feet.",
  },
  {
    icon: MessageSquare,
    title: "AI Design Advisor",
    description:
      "Ask the AI about your actual layout. It reads your floor plan and gives specific suggestions — not generic house advice.",
  },
  {
    icon: Layers3,
    title: "Multi-Floor Support",
    description:
      "Design across multiple floors. Switch between ground floor, first floor, and basement — each floor sharing the same project model.",
  },
  {
    icon: ZoomIn,
    title: "Pan, Zoom & Navigate",
    description:
      "Navigate your floor plan comfortably. Zoom into fine details or pull back for a full overview without affecting your stored measurements.",
  },
  {
    icon: Undo2,
    title: "Undo & Redo",
    description:
      "Every edit is reversible. Move a wall, add a window, or place a door — then undo it instantly. A centralized history stack tracks everything.",
  },
  {
    icon: FlipHorizontal,
    title: "Smart Snapping",
    description:
      "Elements snap to wall endpoints, midpoints, and grid lines. Doors and windows always stay attached to their host walls.",
  },
  {
    icon: Save,
    title: "Save & Restore",
    description:
      "Your project is saved as a structured, versioned JSON format. Reload at any time and your entire plan is restored exactly as you left it.",
  },
  {
    icon: ShieldCheck,
    title: "Approval-Gated AI Changes",
    description:
      "AI can never silently modify your design. Every suggestion requires you to review affected elements and explicitly approve the change.",
  },
];

/**
 * Feature grid showcasing the MVP capabilities of HomeAI Designer.
 */
export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to plan with confidence
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Built for homeowners, renovators, and design enthusiasts who want to
            explore options without committing to expensive professional drafts.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                  <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
