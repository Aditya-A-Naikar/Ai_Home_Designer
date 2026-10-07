import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Final call-to-action section at the bottom of the landing page.
 */
export function CtaSection() {
  return (
    <section className="bg-indigo-600 py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Ready to plan your dream home?
        </h2>
        <p className="mt-4 text-lg text-indigo-100 max-w-xl mx-auto">
          Start with a blank canvas, a plot size, and your ideas. HomeAI Designer
          will help you refine the rest — room by room.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
          >
            Start Designing — Free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/projects/demo"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-400 bg-indigo-700 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
          >
            Explore Demo
          </Link>
        </div>
        <p className="mt-4 text-xs text-indigo-200">
          No account required for the demo. AI suggestions are design guidance — not engineering advice.
        </p>
      </div>
    </section>
  );
}
