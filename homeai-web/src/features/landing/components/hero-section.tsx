import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InteractiveTeaser } from "./interactive-teaser";

/**
 * Hero section: Value proposition, primary + secondary CTAs, interactive teaser.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white pt-16 pb-20 lg:pt-24 lg:pb-28">
      {/* Background gradient decoration */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-200 to-purple-100 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Text content */}
          <div className="flex-1 text-center lg:text-left">
            <Badge variant="info" className="mb-4">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              AI-Assisted Home Planning
            </Badge>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Plan your dream home{" "}
              <span className="text-indigo-600">before you build it</span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 sm:text-xl max-w-2xl mx-auto lg:mx-0">
              HomeAI Designer is an intelligent workspace where you create precise
              2D floor plans, discuss design decisions with AI, and eventually
              visualize your approved ideas in 3D — all before breaking ground.
            </p>

            {/* Workflow tagline */}
            <div className="mt-6 flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              {["Plan", "Discuss", "Modify", "Visualize"].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-700 text-sm bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <ArrowRight
                      className="h-3.5 w-3.5 text-slate-400"
                      aria-hidden="true"
                    />
                  )}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/projects/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                Start Designing — Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/projects/demo"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Explore Demo
              </Link>
            </div>

            {/* Trust note */}
            <p className="mt-4 text-xs text-slate-400">
              No account required to try the demo. Design suggestions — not
              certified engineering advice.
            </p>
          </div>

          {/* Right: Interactive teaser */}
          <div className="flex-1 w-full max-w-lg lg:max-w-none">
            <InteractiveTeaser />
          </div>
        </div>
      </div>
    </section>
  );
}
