import { Project } from "@/core/domain/types";
import { ProjectSchema } from "@/core/domain/schema";
import { generateId } from "@/core/domain/project-factory";
import { getDemoProject, getMyHomeProject } from "@/core/domain/demo-project";
import { IProjectRepository } from "./project-repository.interface";

const STORAGE_KEY = "homeai_projects_v1";

export class LocalStorageProjectRepository implements IProjectRepository {
  private isClient(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  private readStorage(): Record<string, unknown>[] {
    if (!this.isClient()) return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("Failed to parse projects from localStorage:", err);
      return [];
    }
  }

  private writeStorage(projects: Project[]): void {
    if (!this.isClient()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (err) {
      console.error("Failed to write projects to localStorage:", err);
      throw new Error("Unable to save project. Storage may be full.");
    }
  }

  async getAll(): Promise<Project[]> {
    const rawItems = this.readStorage();
    const validProjects: Project[] = [];

    for (const item of rawItems) {
      const result = ProjectSchema.safeParse(item);
      if (result.success) {
        validProjects.push(result.data as Project);
      } else {
        console.warn("Discarding invalid project entry from localStorage:", result.error);
      }
    }

    // Sort by updatedAt descending
    return validProjects.sort(
      (a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
    );
  }

  async getById(id: string): Promise<Project | null> {
    const all = await this.getAll();
    const found = all.find((p) => p.id === id);
    if (found) return found;

    if (id === "my-home") {
      const myHome = getMyHomeProject();
      await this.save(myHome);
      return myHome;
    }

    if (id === "demo-sunset-villa" || id === "demo-sunset-ridge") {
      return this.seedDemo();
    }

    return null;
  }

  async save(project: Project): Promise<void> {
    // Validate before saving
    const validated = ProjectSchema.parse(project) as Project;
    const all = await this.getAll();
    const index = all.findIndex((p) => p.id === validated.id);

    const now = new Date().toISOString();
    const toSave: Project = {
      ...validated,
      metadata: {
        ...validated.metadata,
        updatedAt: now,
      },
    };

    if (index >= 0) {
      all[index] = toSave;
    } else {
      all.unshift(toSave);
    }

    this.writeStorage(all);
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll();
    const filtered = all.filter((p) => p.id !== id);
    this.writeStorage(filtered);
  }

  async duplicate(id: string): Promise<Project | null> {
    const original = await this.getById(id);
    if (!original) return null;

    const newId = generateId();
    const now = new Date().toISOString();

    // Deep clone and assign new IDs to project and floors
    const duplicatedFloors = original.floors.map((floor) => {
      const newFloorId = generateId();
      return {
        ...floor,
        id: newFloorId,
        projectId: newId,
        walls: floor.walls.map((w) => ({
          ...w,
          id: generateId(),
          floorId: newFloorId,
          doors: w.doors.map((d) => ({ ...d, id: generateId(), floorId: newFloorId })),
          windows: w.windows.map((win) => ({ ...win, id: generateId(), floorId: newFloorId })),
        })),
        rooms: floor.rooms.map((r) => ({ ...r, id: generateId(), floorId: newFloorId })),
      };
    });

    const duplicatedProject: Project = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      metadata: {
        ...original.metadata,
        createdAt: now,
        updatedAt: now,
      },
      activeFloorId: duplicatedFloors[0]?.id || "",
      floors: duplicatedFloors,
    };

    await this.save(duplicatedProject);
    return duplicatedProject;
  }

  /**
   * Seeds demo project if not already present.
   */
  async seedDemo(): Promise<Project> {
    const demo = getDemoProject();
    const existing = await this.getById(demo.id);
    if (!existing) {
      await this.save(demo);
    }
    return demo;
  }
}

// Singleton repository export
export const projectRepository = new LocalStorageProjectRepository();
