import { Project } from "@/core/domain/types";
import { ProjectSchema } from "@/core/domain/schema";
import { getDemoProject, getMyHomeProject, normalizeProject, cloneTemplateProject } from "@/core/domain/demo-project";
import { IProjectRepository } from "./project-repository.interface";
import {
  wrapProject,
  unwrapProject,
  isQuotaError,
  estimateStorageQuota,
  safeSaveProject,
  safeLoadProject,
  StorageQuotaInfo,
  CorruptedProjectRecord,
} from "@/core/storage/storage-hardening";

const STORAGE_KEY = "homeai_projects_v1";
const BACKUP_KEY = "homeai_projects_v1_backup";
const STANDALONE_KEY_PREFIX = "homeai_project_";

export class LocalStorageProjectRepository implements IProjectRepository {
  private writeLock: Promise<void> = Promise.resolve();
  private corruptedEntries: CorruptedProjectRecord[] = [];

  private isClient(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  }

  /**
   * Reads raw items from localStorage with automatic backup recovery on corrupted JSON.
   */
  private readStorage(): unknown[] {
    if (!this.isClient()) return [];

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check if backup key has data when primary is empty
      const backupRaw = window.localStorage.getItem(BACKUP_KEY);
      if (backupRaw) {
        try {
          const parsedBackup = JSON.parse(backupRaw);
          if (Array.isArray(parsedBackup)) {
            console.info("Recovered project list from backup key.");
            return parsedBackup;
          }
        } catch {
          // Backup also corrupt
        }
      }
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // If not an array, record corruption
      this.recordCorruption(raw, "Storage content is not an array");
    } catch (err) {
      console.warn("Failed to parse projects from localStorage primary key:", err);
      this.recordCorruption(raw, (err as Error).message);

      // Attempt recovery from backup
      const backupRaw = window.localStorage.getItem(BACKUP_KEY);
      if (backupRaw) {
        try {
          const parsedBackup = JSON.parse(backupRaw);
          if (Array.isArray(parsedBackup)) {
            console.info("Successfully recovered project list from backup key after primary parse failure.");
            return parsedBackup;
          }
        } catch {
          // Backup also corrupted
        }
      }

      // Standalone keys scan fallback
      const standalone = this.scanStandaloneProjects();
      if (standalone.length > 0) {
        console.info(`Recovered ${standalone.length} project(s) from standalone storage keys.`);
        return standalone;
      }
    }

    return [];
  }

  /**
   * Scans individual standalone project keys ("homeai_project_*") for recovery.
   */
  private scanStandaloneProjects(): Project[] {
    if (!this.isClient()) return [];
    const recovered: Project[] = [];

    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(STANDALONE_KEY_PREFIX) && key !== STORAGE_KEY && key !== BACKUP_KEY) {
          const projectId = key.slice(STANDALONE_KEY_PREFIX.length);
          const result = safeLoadProject(projectId);
          if (result.success && result.data) {
            recovered.push(result.data);
          }
        }
      }
    } catch {
      // Ignore scan errors
    }

    return recovered;
  }

  private recordCorruption(raw: unknown, error: string, id?: string, name?: string): void {
    this.corruptedEntries.push({
      id,
      name,
      raw,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Writes the project list atomically with a pre-write backup snapshot and rollback on quota exhaustion.
   */
  private writeStorage(projects: unknown[]): void {
    if (!this.isClient()) return;

    // Snapshot existing valid primary state into backup before write
    const existingRaw = window.localStorage.getItem(STORAGE_KEY);
    if (existingRaw) {
      try {
        window.localStorage.setItem(BACKUP_KEY, existingRaw);
      } catch {
        // Quota might be near, but attempt primary write
      }
    }

    try {
      const serialized = JSON.stringify(projects);
      window.localStorage.setItem(STORAGE_KEY, serialized);

      // Ensure backup has at least the initial snapshot
      if (!window.localStorage.getItem(BACKUP_KEY)) {
        try {
          window.localStorage.setItem(BACKUP_KEY, serialized);
        } catch {
          // Ignore
        }
      }
    } catch (err: unknown) {
      console.error("Failed to write projects to localStorage:", err);

      // If write failed, attempt rollback from backup
      if (existingRaw) {
        try {
          window.localStorage.setItem(STORAGE_KEY, existingRaw);
        } catch {
          // Rollback failed
        }
      }

      if (isQuotaError(err)) {
        throw new Error("Browser storage quota exceeded. Please export your projects to JSON or clean up drafts.");
      }

      throw new Error(`Unable to save project: ${(err as Error).message || "Storage error"}`);
    }
  }

  /**
   * Synchronizes writes through an internal promise chain to prevent concurrent race conditions.
   */
  private async withLock<T>(action: () => Promise<T>): Promise<T> {
    const currentLock = this.writeLock;
    let releaseLock: () => void = () => {};
    this.writeLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    try {
      await currentLock;
      return await action();
    } finally {
      releaseLock();
    }
  }

  async getAll(): Promise<Project[]> {
    const rawItems = this.readStorage();
    const validProjects: Project[] = [];

    for (const item of rawItems) {
      const result = unwrapProject(item);
      if (!result.isCorrupted && result.project) {
        validProjects.push(result.project);
      } else {
        const id = (item as Record<string, unknown>)?.id as string | undefined;
        const name = (item as Record<string, unknown>)?.name as string | undefined;
        this.recordCorruption(item, result.error || "Corrupted project format", id, name);
        console.warn("Discarding invalid or corrupted project entry from localStorage:", result.error);
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

    // Check standalone key as secondary recovery lookup
    const standaloneResult = safeLoadProject(id);
    if (standaloneResult.success && standaloneResult.data) {
      // Re-integrate standalone project into list
      await this.save(standaloneResult.data);
      return standaloneResult.data;
    }

    if (id === "my-home") {
      const myHome = getMyHomeProject();
      await this.save(myHome);
      return myHome;
    }

    if (id === "demo-sunset-villa" || id === "demo-sunset-ridge") {
      const demo = getDemoProject();
      await this.save(demo);
      return demo;
    }

    return null;
  }

  async save(project: Project): Promise<void> {
    const normalized = normalizeProject(project);

    // 1. Strict schema validation prior to write
    const validationResult = ProjectSchema.safeParse(normalized);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Project schema validation failed prior to saving: ${issues}`);
    }

    const validated = validationResult.data as Project;

    // 2. Perform atomic, serialized write
    await this.withLock(async () => {
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

      // Dual-write: individual project container for granular isolation
      const standaloneSaveResult = safeSaveProject(toSave);
      if (!standaloneSaveResult.success && isQuotaError(standaloneSaveResult.error)) {
        throw new Error("Browser storage quota exceeded. Please export your projects to JSON or clean up drafts.");
      }

      // Wrap list items with integrity container
      const wrappedList = all.map((p) => wrapProject(p));
      this.writeStorage(wrappedList);
    });
  }

  async delete(id: string): Promise<void> {
    await this.withLock(async () => {
      const all = await this.getAll();
      const filtered = all.filter((p) => p.id !== id);
      const wrappedList = filtered.map((p) => wrapProject(p));
      this.writeStorage(wrappedList);

      if (this.isClient()) {
        try {
          window.localStorage.removeItem(`${STANDALONE_KEY_PREFIX}${id}`);
        } catch {
          // Ignore removal error
        }
      }
    });
  }

  async duplicate(id: string): Promise<Project | null> {
    const original = await this.getById(id);
    if (!original) return null;

    const duplicatedProject = cloneTemplateProject(original, `${original.name} (Copy)`);

    await this.save(duplicatedProject);
    return duplicatedProject;
  }

  /**
   * Seeds demo project if not already present.
   */
  async seedDemo(): Promise<Project> {
    const demo = getDemoProject();
    const all = await this.getAll();
    const existing = all.find((p) => p.id === demo.id);
    if (!existing) {
      await this.save(demo);
      return demo;
    }
    return existing;
  }

  /**
   * Estimates storage quota and returns usage metrics.
   */
  getStorageQuota(): StorageQuotaInfo {
    return estimateStorageQuota();
  }

  /**
   * Returns records of corrupted projects detected during read operations.
   */
  getCorruptedProjects(): CorruptedProjectRecord[] {
    return [...this.corruptedEntries];
  }

  /**
   * Restores the primary project list from the backup key.
   */
  async restoreFromBackup(): Promise<boolean> {
    if (!this.isClient()) return false;
    const backupRaw = window.localStorage.getItem(BACKUP_KEY);
    if (!backupRaw) return false;

    try {
      const parsed = JSON.parse(backupRaw);
      if (Array.isArray(parsed)) {
        window.localStorage.setItem(STORAGE_KEY, backupRaw);
        return true;
      }
    } catch {
      // Backup not valid JSON
    }
    return false;
  }
}

// Singleton repository export
export const projectRepository = new LocalStorageProjectRepository();
