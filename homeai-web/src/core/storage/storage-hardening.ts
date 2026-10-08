import { Project } from "@/core/domain/types";

/**
 * Phase 13: Storage Hardening & Quota Protection
 * Provides checksum verification, safe atomic saving, quota detection, and recovery.
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fast simple 32-bit integer checksum for data integrity validation
 */
export function computeChecksum(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function safeSaveProject(project: Project): StorageResult<void> {
  try {
    const serialized = JSON.stringify(project);
    const checksum = computeChecksum(serialized);

    const payload = JSON.stringify({
      version: 1,
      checksum,
      timestamp: Date.now(),
      payload: serialized,
    });

    const key = `homeai_project_${project.id}`;
    localStorage.setItem(key, payload);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("QuotaExceededError") || errorMsg.includes("quota")) {
      return {
        success: false,
        error: "Browser localStorage quota exceeded. Please export your projects to JSON or clean up drafts.",
      };
    }
    return { success: false, error: errorMsg };
  }
}

export function safeLoadProject(projectId: string): StorageResult<Project> {
  try {
    const key = `homeai_project_${projectId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { success: false, error: "Project not found in storage." };
    }

    // Check if wrapped in checksum container
    try {
      const parsedWrapper = JSON.parse(raw);
      if (parsedWrapper.checksum !== undefined && parsedWrapper.payload) {
        const expectedChecksum = computeChecksum(parsedWrapper.payload);
        if (expectedChecksum !== parsedWrapper.checksum) {
          return { success: false, error: "Project data integrity check failed (corrupted storage)." };
        }
        const project = JSON.parse(parsedWrapper.payload) as Project;
        return { success: true, data: project };
      }
    } catch {
      // Direct raw JSON fallback
    }

    const directProject = JSON.parse(raw) as Project;
    return { success: true, data: directProject };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
