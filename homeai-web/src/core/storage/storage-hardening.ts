import { Project } from "@/core/domain/types";
import { ProjectSchema } from "@/core/domain/schema";

/**
 * Stage 1.2: Unified Persistence & Storage Quota Protection
 * Provides checksum verification, safe atomic saving, quota detection, and recovery.
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StorageContainer<T = string> {
  version: number;
  checksum: number;
  timestamp: number;
  payload: T;
}

export interface StorageQuotaInfo {
  usedBytes: number;
  totalLimitBytes: number;
  usagePercentage: number;
  isNearQuota: boolean;
  projectCount: number;
}

export interface CorruptedProjectRecord {
  id?: string;
  name?: string;
  raw: unknown;
  error: string;
  timestamp: number;
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

/**
 * Detects whether an error thrown during storage write is a quota exhaustion error.
 * Supports W3C DOMException QuotaExceededError, Firefox NS_ERROR_DOM_QUOTA_REACHED,
 * legacy error codes 22 / 1014, and error messages containing 'quota'.
 */
export function isQuotaError(err: unknown): boolean {
  if (!err) return false;

  if (typeof err === "object" && err !== null) {
    const e = err as { name?: string; code?: number; message?: string };
    if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      return true;
    }
    if (e.code === 22 || e.code === 1014) {
      return true;
    }
    if (typeof e.message === "string") {
      const msg = e.message.toLowerCase();
      if (
        msg.includes("quota") ||
        msg.includes("storage full") ||
        msg.includes("storage may be full") ||
        msg.includes("exceeded the quota")
      ) {
        return true;
      }
    }
  }

  if (typeof err === "string") {
    const msg = err.toLowerCase();
    if (
      msg.includes("quota") ||
      msg.includes("storage full") ||
      msg.includes("storage may be full") ||
      msg.includes("exceeded the quota")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Estimates localStorage byte usage and proximity to the standard ~5MB limit.
 */
export function estimateStorageQuota(limitBytes: number = 5 * 1024 * 1024): StorageQuotaInfo {
  let usedBytes = 0;
  let projectCount = 0;

  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const val = window.localStorage.getItem(key) || "";
          // UTF-16 character byte length approximation
          usedBytes += (key.length + val.length) * 2;
          if (key.startsWith("homeai_project_") && key !== "homeai_projects_v1" && key !== "homeai_projects_v1_backup") {
            projectCount++;
          }
        }
      }
    } catch {
      // Ignore security or access errors
    }
  }

  const usagePercentage = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const isNearQuota = usagePercentage >= 80 || usedBytes >= 4 * 1024 * 1024;

  return {
    usedBytes,
    totalLimitBytes: limitBytes,
    usagePercentage,
    isNearQuota,
    projectCount,
  };
}

/**
 * Wraps a project into a tamper-evident container with an integrity checksum and timestamp.
 */
export function wrapProject(project: Project): StorageContainer<string> {
  const serialized = JSON.stringify(project);
  return {
    version: 1,
    checksum: computeChecksum(serialized),
    timestamp: Date.now(),
    payload: serialized,
  };
}

/**
 * Unwraps and validates project data from a raw storage item.
 * Supports wrapped containers (both string and object payloads) as well as legacy unwrapped projects.
 */
export function unwrapProject(rawItem: unknown): {
  project: Project | null;
  isCorrupted: boolean;
  error?: string;
} {
  if (!rawItem || typeof rawItem !== "object") {
    return {
      project: null,
      isCorrupted: true,
      error: "Item is null, undefined or not an object.",
    };
  }

  const item = rawItem as Record<string, unknown>;

  // Case 1: Wrapped container with checksum
  if (item.checksum !== undefined && item.payload !== undefined) {
    if (typeof item.payload === "string") {
      const expectedChecksum = computeChecksum(item.payload);
      if (expectedChecksum !== item.checksum) {
        return {
          project: null,
          isCorrupted: true,
          error: "Project data integrity check failed (corrupted storage).",
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(item.payload);
      } catch (e) {
        return {
          project: null,
          isCorrupted: true,
          error: `Malformed JSON in container payload: ${(e as Error).message}`,
        };
      }

      const schemaResult = ProjectSchema.safeParse(parsed);
      if (!schemaResult.success) {
        const issues = schemaResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return {
          project: null,
          isCorrupted: true,
          error: `Project schema validation failed: ${issues}`,
        };
      }

      return {
        project: schemaResult.data as Project,
        isCorrupted: false,
      };
    } else if (typeof item.payload === "object" && item.payload !== null) {
      // Payload stored directly as object
      const schemaResult = ProjectSchema.safeParse(item.payload);
      if (!schemaResult.success) {
        const issues = schemaResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return {
          project: null,
          isCorrupted: true,
          error: `Project schema validation failed: ${issues}`,
        };
      }
      return {
        project: schemaResult.data as Project,
        isCorrupted: false,
      };
    }
  }

  // Case 2: Legacy unwrapped Project object
  const schemaResult = ProjectSchema.safeParse(rawItem);
  if (schemaResult.success) {
    return {
      project: schemaResult.data as Project,
      isCorrupted: false,
    };
  }

  // Corrupted / invalid project
  const issues = schemaResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  return {
    project: null,
    isCorrupted: true,
    error: `Invalid project structure: ${issues}`,
  };
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
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      window.localStorage.setItem(key, payload);
    }
    return { success: true };
  } catch (err: unknown) {
    if (isQuotaError(err)) {
      return {
        success: false,
        error: "Browser localStorage quota exceeded. Please export your projects to JSON or clean up drafts.",
      };
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

export function safeLoadProject(projectId: string): StorageResult<Project> {
  try {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return { success: false, error: "Storage unavailable" };
    }
    const key = `homeai_project_${projectId}`;
    const raw = window.localStorage.getItem(key);
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
        const project = (typeof parsedWrapper.payload === "string"
          ? JSON.parse(parsedWrapper.payload)
          : parsedWrapper.payload) as Project;
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
