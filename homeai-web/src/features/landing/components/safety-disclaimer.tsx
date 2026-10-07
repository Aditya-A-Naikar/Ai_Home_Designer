import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const isStatements = [
  "A conceptual home planning and visualization workspace",
  "An AI design advisor for spatial suggestions",
  "A tool to explore layout options and design trade-offs",
  "A creative platform for homeowners and design enthusiasts",
];

const isNotStatements = [
  "A licensed architectural or engineering firm",
  "A source of certified structural calculations",
  "A building code or fire-safety compliance tool",
  "A replacement for a licensed architect or engineer",
];

/**
 * Safety disclaimer section — critical for product integrity.
 * Makes the scope and safety boundary of AI outputs unmistakably clear.
 */
export function SafetyDisclaimer() {
  return (
    <section id="safety" className="bg-amber-50 border-y border-amber-200 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-900">
                Important: Design Assistance, Not Engineering Certification
              </h2>
              <p className="text-sm text-amber-700">
                Please read this before relying on any output from HomeAI Designer.
              </p>
            </div>
          </div>

          {/* Content grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Is */}
            <div className="rounded-xl border border-emerald-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 mb-3">
                <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                HomeAI Designer IS:
              </h3>
              <ul className="space-y-2">
                {isStatements.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Is not */}
            <div className="rounded-xl border border-red-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-800 mb-3">
                <XCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
                HomeAI Designer is NOT:
              </h3>
              <ul className="space-y-2">
                {isNotStatements.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom note */}
          <p className="mt-6 text-sm text-amber-800 leading-relaxed">
            <strong>Always consult a licensed architect, structural engineer, and local
            building authority</strong> before making construction decisions. AI design
            suggestions in HomeAI Designer are conceptual only and do not constitute
            professional engineering advice, structural certification, or building code
            compliance approval.
          </p>
        </div>
      </div>
    </section>
  );
}
