import { CreateProjectWizard } from "@/features/project-mgmt/components/create-project-wizard";

export const metadata = {
  title: "Create New Project | HomeAI Designer",
  description: "Set up plot dimensions, style preferences, and floors for your new home design.",
};

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CreateProjectWizard />
      </div>
    </div>
  );
}
