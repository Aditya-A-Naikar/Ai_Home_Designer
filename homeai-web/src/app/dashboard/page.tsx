import { ProjectDashboard } from "@/features/project-mgmt/components/project-dashboard";

export const metadata = {
  title: "Projects Dashboard | HomeAI Designer",
  description: "Manage your floor plan designs, duplicate layouts, and create new home projects.",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProjectDashboard />
      </div>
    </div>
  );
}
