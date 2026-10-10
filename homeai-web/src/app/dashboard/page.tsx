import { ProjectDashboard } from "@/features/project-mgmt/components/project-dashboard";

export const metadata = {
  title: "Architectural Workspace | HomeAI Studio",
  description: "Manage your residential floor plans, CAD blueprints, and 3D BIM models.",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#070a10] py-10 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProjectDashboard />
      </div>
    </div>
  );
}
