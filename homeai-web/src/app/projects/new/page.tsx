import { CreateProjectWizard } from "@/features/project-mgmt/components/create-project-wizard";

export const metadata = {
  title: "New Project Wizard | HomeAI Studio",
  description: "Initialize plot dimensions, structural typology, and regulatory standards.",
};

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-[#070a10] py-10 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <CreateProjectWizard />
      </div>
    </div>
  );
}
