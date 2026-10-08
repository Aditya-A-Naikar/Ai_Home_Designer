import { Project } from "@/core/domain/types";

export interface IProjectRepository {
  /**
   * Retrieves all projects, sorted by updatedAt descending.
   */
  getAll(): Promise<Project[]>;

  /**
   * Retrieves a single project by ID, or null if not found.
   */
  getById(id: string): Promise<Project | null>;

  /**
   * Saves or updates a project.
   */
  save(project: Project): Promise<void>;

  /**
   * Deletes a project by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Duplicates an existing project under a new ID and timestamp.
   */
  duplicate(id: string): Promise<Project | null>;
}
