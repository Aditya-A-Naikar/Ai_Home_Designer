import { Project } from "../domain/types";
import { ProjectSchema } from "../domain/schema";

/**
 * Serializes a Project into formatted JSON with metadata.
 */
export function exportProjectToJson(project: Project): string {
  const cleanProject: Project = {
    ...project,
    metadata: {
      ...project.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
  return JSON.stringify(cleanProject, null, 2);
}

/**
 * Triggers a browser download of the Project as a .homeai.json file.
 */
export function downloadProjectJson(project: Project): void {
  if (typeof window === "undefined") return;

  const jsonStr = exportProjectToJson(project);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const sanitizedName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizedName || "project"}.homeai.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ParseResult {
  success: boolean;
  project?: Project;
  error?: string;
}

/**
 * Validates and parses raw JSON into a typed Project, handling schema version checks.
 */
export function parseProjectJson(jsonString: string): ParseResult {
  try {
    const raw = JSON.parse(jsonString);
    if (!raw || typeof raw !== "object") {
      return { success: false, error: "Invalid JSON format: expected an object." };
    }

    const result = ProjectSchema.safeParse(raw);
    if (!result.success) {
      const errorMsg = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
      return { success: false, error: `Project schema validation failed: ${errorMsg}` };
    }

    return { success: true, project: result.data as Project };
  } catch (err: unknown) {
    return { success: false, error: `JSON parse error: ${(err as Error).message}` };
  }
}
