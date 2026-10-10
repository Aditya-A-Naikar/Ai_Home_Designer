import React from "react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  computeChecksum,
  wrapProject,
  unwrapProject,
  isQuotaError,
  estimateStorageQuota,
  safeSaveProject,
  safeLoadProject,
} from "@/core/storage/storage-hardening";
import { LocalStorageProjectRepository } from "@/infrastructure/persistence/local-storage-project-repository";
import { useProjectStore } from "@/store/project-store";
import { useCanvasStore } from "@/store/canvas-store";
import { CanvasToolbar } from "@/features/canvas/components/canvas-toolbar";
import EditorPage from "@/app/editor/[projectId]/page";
import { getMyHomeProject } from "@/core/domain/demo-project";
import * as jsonExporter from "@/core/export/json-exporter";
import { Project } from "@/core/domain/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ projectId: "test-persistence-project" }),
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock Link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Level 1, Stage 1.2: Unified Persistence & Storage Quota Protection", () => {
  let sampleProject: Project;

  beforeEach(() => {
    window.localStorage.clear();
    sampleProject = getMyHomeProject();
    useCanvasStore.setState({
      activeDrawer: "none",
      tool: "select",
      isModified: false,
    });
    useProjectStore.setState({
      currentProject: null,
      isSaving: false,
      isLoading: false,
      error: null,
      saveStatus: "idle",
      saveError: null,
      storageWarning: null,
      lastSavedAt: null,
      past: [],
      future: [],
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. CHECKSUM & CONTAINER INTEGRITY
  // =========================================================================
  describe("1. Checksum & Container Integrity", () => {
    it("computes deterministic integer checksums for JSON strings", () => {
      const serialized = JSON.stringify(sampleProject);
      const cs1 = computeChecksum(serialized);
      const cs2 = computeChecksum(serialized);
      expect(cs1).toBe(cs2);
      expect(typeof cs1).toBe("number");

      // Bit tampering / modification alters checksum
      const tampered = serialized.replace('"My Home"', '"Tampered Home"');
      const csTampered = computeChecksum(tampered);
      expect(csTampered).not.toBe(cs1);
    });

    it("wraps a project into a tamper-evident StorageContainer", () => {
      const container = wrapProject(sampleProject);
      expect(container.version).toBe(1);
      expect(typeof container.checksum).toBe("number");
      expect(typeof container.timestamp).toBe("number");
      expect(typeof container.payload).toBe("string");
      expect(container.checksum).toBe(computeChecksum(container.payload));
    });

    it("successfully unwraps a valid StorageContainer and validates schema", () => {
      const container = wrapProject(sampleProject);
      const result = unwrapProject(container);
      expect(result.isCorrupted).toBe(false);
      expect(result.project).not.toBeNull();
      expect(result.project?.id).toBe(sampleProject.id);
      expect(result.project?.name).toBe(sampleProject.name);
    });

    it("detects tampered checksum and flags container as corrupted", () => {
      const container = wrapProject(sampleProject);
      container.checksum = 88888888; // Tamper checksum
      const result = unwrapProject(container);
      expect(result.isCorrupted).toBe(true);
      expect(result.project).toBeNull();
      expect(result.error).toContain("integrity check failed");
    });

    it("supports backward-compatible unwrapping of legacy unwrapped project objects", () => {
      // Legacy item has no checksum/payload wrapper
      const result = unwrapProject(sampleProject);
      expect(result.isCorrupted).toBe(false);
      expect(result.project?.id).toBe(sampleProject.id);
    });

    it("flags non-project objects as invalid structure without throwing", () => {
      const result = unwrapProject({ someRandomField: 123 });
      expect(result.isCorrupted).toBe(true);
      expect(result.project).toBeNull();
      expect(result.error).toContain("Invalid project structure");
    });
  });

  // =========================================================================
  // 2. STORAGE QUOTA DETECTION & ESTIMATION
  // =========================================================================
  describe("2. Storage Quota Detection & Estimation", () => {
    it("accurately identifies standard W3C and vendor QuotaExceededError instances", () => {
      const domQuotaErr = new DOMException("The quota has been exceeded", "QuotaExceededError");
      expect(isQuotaError(domQuotaErr)).toBe(true);

      const firefoxQuotaErr = new DOMException("Quota reached", "NS_ERROR_DOM_QUOTA_REACHED");
      expect(isQuotaError(firefoxQuotaErr)).toBe(true);

      const legacyCode22 = { code: 22, message: "Storage full" };
      expect(isQuotaError(legacyCode22)).toBe(true);

      const stringError = "Error: Browser localStorage quota exceeded";
      expect(isQuotaError(stringError)).toBe(true);

      const unrelatedErr = new Error("Network timeout");
      expect(isQuotaError(unrelatedErr)).toBe(false);
    });

    it("estimates storage quota and flags warning when storage usage reaches 80%", () => {
      // Empty storage
      const initialQuota = estimateStorageQuota(5 * 1024 * 1024);
      expect(initialQuota.usedBytes).toBe(0);
      expect(initialQuota.isNearQuota).toBe(false);

      // Add ~4.1MB of data into localStorage to exceed 80% threshold
      const largeData = "x".repeat(2_100_000); // ~4.2MB in UTF-16
      window.localStorage.setItem("mock_large_data", largeData);

      const nearQuotaInfo = estimateStorageQuota(5 * 1024 * 1024);
      expect(nearQuotaInfo.usedBytes).toBeGreaterThan(4_000_000);
      expect(nearQuotaInfo.usagePercentage).toBeGreaterThanOrEqual(80);
      expect(nearQuotaInfo.isNearQuota).toBe(true);
    });
  });

  // =========================================================================
  // 3. REPOSITORY PERSISTENCE, BACKUP & CORRUPTION RESILIENCE
  // =========================================================================
  describe("3. Repository Atomic Persistence & Data Protection", () => {
    it("saves and loads projects with checksum-wrapped container and standalone key sync", async () => {
      const repo = new LocalStorageProjectRepository();
      await repo.save(sampleProject);

      // Verify stored in primary key
      const loaded = await repo.getById(sampleProject.id);
      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe(sampleProject.name);

      // Verify dual-write saved in standalone key
      const standalone = safeLoadProject(sampleProject.id);
      expect(standalone.success).toBe(true);
      expect(standalone.data?.id).toBe(sampleProject.id);
    });

    it("creates a pre-write backup snapshot in homeai_projects_v1_backup", async () => {
      const repo = new LocalStorageProjectRepository();
      await repo.save(sampleProject);

      // Modify and save again
      const modified = { ...sampleProject, name: "Modified Name" };
      await repo.save(modified);

      const backupRaw = window.localStorage.getItem("homeai_projects_v1_backup");
      expect(backupRaw).not.toBeNull();
      const parsedBackup = JSON.parse(backupRaw!);
      expect(Array.isArray(parsedBackup)).toBe(true);
      expect(parsedBackup.length).toBeGreaterThan(0);
    });

    it("recovers from corrupted primary JSON by falling back to backup key without wiping storage", async () => {
      const repo = new LocalStorageProjectRepository();
      await repo.save(sampleProject);

      // Verify backup exists
      const backupRaw = window.localStorage.getItem("homeai_projects_v1_backup") || window.localStorage.getItem("homeai_projects_v1");
      window.localStorage.setItem("homeai_projects_v1_backup", backupRaw!);

      // Corrupt primary key with malformed JSON
      window.localStorage.setItem("homeai_projects_v1", "{ malformed_json: true, unexpected token");

      // getAll must not crash or wipe storage, it must restore from backup
      const all = await repo.getAll();
      expect(all.length).toBe(1);
      expect(all[0].name).toBe(sampleProject.name);

      const corrupted = repo.getCorruptedProjects();
      expect(corrupted.length).toBeGreaterThan(0);
    });

    it("falls back to standalone keys when both primary and backup are missing or corrupted", async () => {
      const repo = new LocalStorageProjectRepository();
      // Save directly via safeSaveProject
      safeSaveProject(sampleProject);

      // Destroy primary and backup keys
      window.localStorage.setItem("homeai_projects_v1", "CORRUPTED");
      window.localStorage.removeItem("homeai_projects_v1_backup");

      const all = await repo.getAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(sampleProject.id);
    });

    it("rolls back to previous good state on QuotaExceededError during write", async () => {
      const repo = new LocalStorageProjectRepository();
      await repo.save(sampleProject);

      const originalRaw = window.localStorage.getItem("homeai_projects_v1");

      // Spy on Storage.prototype.setItem to throw QuotaExceededError on the first write
      // and allow subsequent rollback write to succeed
      const originalSetItem = Storage.prototype.setItem;
      let callCount = 0;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, val: string) {
        if (key === "homeai_projects_v1") {
          callCount++;
          if (callCount === 1) {
            throw new DOMException("Quota exceeded", "QuotaExceededError");
          }
        }
        return originalSetItem.call(this, key, val);
      });

      const modified = { ...sampleProject, name: "Exceeding Project" };
      await expect(repo.save(modified)).rejects.toThrow(/quota/i);

      // Verify that primary storage was not wiped or left in corrupted state
      const currentRaw = window.localStorage.getItem("homeai_projects_v1");
      expect(currentRaw).toBe(originalRaw);
    });

    it("serializes concurrent save operations to prevent write race conditions", async () => {
      const repo = new LocalStorageProjectRepository();

      const p1 = { ...sampleProject, name: "Concurrent 1" };
      const p2 = { ...sampleProject, name: "Concurrent 2" };

      // Fire both concurrently
      await Promise.all([repo.save(p1), repo.save(p2)]);

      const loaded = await repo.getById(sampleProject.id);
      expect(loaded).not.toBeNull();
      // One of them is safely the final state, no corrupted JSON or dropped list
      expect(["Concurrent 1", "Concurrent 2"]).toContain(loaded?.name);
      const all = await repo.getAll();
      expect(all.length).toBe(1); // Deduped by id
    });

    it("supports manual restoreFromBackup", async () => {
      const repo = new LocalStorageProjectRepository();
      await repo.save(sampleProject);

      window.localStorage.setItem("homeai_projects_v1", "[]");
      const restored = await repo.restoreFromBackup();
      expect(restored).toBe(true);

      const all = await repo.getAll();
      expect(all.length).toBe(1);
      expect(all[0].id).toBe(sampleProject.id);
    });
  });

  // =========================================================================
  // 4. PROJECT STORE IN-MEMORY SAFETY & STATUS TRACKING
  // =========================================================================
  describe("4. Project Store In-Memory Safety & Granular Status Tracking", () => {
    it("transitions saveStatus to 'saving' then 'saved' on successful save", async () => {
      useProjectStore.setState({ currentProject: sampleProject });

      const savePromise = useProjectStore.getState().saveProject();
      expect(useProjectStore.getState().saveStatus).toBe("saving");
      expect(useProjectStore.getState().isSaving).toBe(true);

      await savePromise;
      expect(useProjectStore.getState().saveStatus).toBe("saved");
      expect(useProjectStore.getState().isSaving).toBe(false);
      expect(useProjectStore.getState().lastSavedAt).not.toBeNull();
      expect(useProjectStore.getState().saveError).toBeNull();
    });

    it("preserves in-memory currentProject completely when save fails with quota error", async () => {
      useProjectStore.setState({ currentProject: sampleProject });

      // Mock projectRepository.save to simulate QuotaExceededError
      const { projectRepository } = await import("@/infrastructure/persistence/local-storage-project-repository");
      vi.spyOn(projectRepository, "save").mockRejectedValue(
        new DOMException("Quota exceeded", "QuotaExceededError")
      );

      await useProjectStore.getState().saveProject();

      expect(useProjectStore.getState().saveStatus).toBe("quota_exceeded");
      expect(useProjectStore.getState().saveError?.toLowerCase()).toContain("quota");
      // CRITICAL: currentProject MUST REMAIN INTACT!
      expect(useProjectStore.getState().currentProject).not.toBeNull();
      expect(useProjectStore.getState().currentProject?.id).toBe(sampleProject.id);
      expect(useProjectStore.getState().currentProject?.name).toBe(sampleProject.name);
    });

    it("triggers pure in-memory JSON export via backupCurrentProject without touching storage", () => {
      const downloadSpy = vi.spyOn(jsonExporter, "downloadProjectJson").mockImplementation(() => {});
      useProjectStore.setState({ currentProject: sampleProject });

      useProjectStore.getState().backupCurrentProject();
      expect(downloadSpy).toHaveBeenCalledWith(sampleProject);
    });

    it("updates storageWarning when quota exceeds 80%", async () => {
      useProjectStore.setState({ currentProject: sampleProject });

      // Fill storage to near capacity
      window.localStorage.setItem("filler", "f".repeat(2_100_000));

      await useProjectStore.getState().saveProject();
      expect(useProjectStore.getState().storageWarning).toContain("Storage is");
    });
  });

  // =========================================================================
  // 5. CANVAS TOOLBAR PERSISTENCE BADGE UI & ACTIONS
  // =========================================================================
  describe("5. CanvasToolbar Persistence Indicators & Recovery Actions", () => {
    it("renders 'Saving...' badge when saveStatus is 'saving'", () => {
      useProjectStore.setState({
        currentProject: sampleProject,
        saveStatus: "saving",
        isSaving: true,
      });

      render(<CanvasToolbar />);
      expect(screen.getByTestId("save-status-saving")).toBeInTheDocument();
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });

    it("renders 'Saved' badge when saveStatus is 'saved' and not modified", () => {
      useProjectStore.setState({
        currentProject: sampleProject,
        saveStatus: "saved",
        isSaving: false,
      });
      useCanvasStore.setState({ isModified: false });

      render(<CanvasToolbar />);
      expect(screen.getByTestId("save-status-saved")).toBeInTheDocument();
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });

    it("renders '● Unsaved' badge when isModified is true", () => {
      useProjectStore.setState({
        currentProject: sampleProject,
        saveStatus: "saved",
        isSaving: false,
      });
      useCanvasStore.setState({ isModified: true });

      render(<CanvasToolbar />);
      expect(screen.getByTestId("save-status-unsaved")).toBeInTheDocument();
      expect(screen.getByText("● Unsaved")).toBeInTheDocument();
    });

    it("renders 'Storage Full' with 'Backup JSON' button on quota exhaustion", () => {
      const downloadSpy = vi.spyOn(jsonExporter, "downloadProjectJson").mockImplementation(() => {});
      useProjectStore.setState({
        currentProject: sampleProject,
        saveStatus: "quota_exceeded",
        saveError: "Browser storage quota exceeded.",
        isSaving: false,
      });

      render(<CanvasToolbar />);
      expect(screen.getByTestId("save-status-quota")).toBeInTheDocument();
      expect(screen.getByText("Storage Full")).toBeInTheDocument();

      const backupBtn = screen.getByTestId("backup-now-button");
      expect(backupBtn).toBeInTheDocument();

      fireEvent.click(backupBtn);
      expect(downloadSpy).toHaveBeenCalledWith(sampleProject);
    });

    it("renders 'Save Failed' with 'Retry' button on regular save failure", async () => {
      const retrySpy = vi.fn();
      useProjectStore.setState({
        currentProject: sampleProject,
        saveStatus: "error",
        saveError: "Network or disk error",
        isSaving: false,
        retrySave: retrySpy,
      });

      render(<CanvasToolbar />);
      expect(screen.getByTestId("save-status-error")).toBeInTheDocument();
      expect(screen.getByText("Save Failed")).toBeInTheDocument();

      const retryBtn = screen.getByTestId("retry-save-button");
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);
      expect(retrySpy).toHaveBeenCalled();
    });

    it("renders 'Storage 80%+' warning badge when storage is nearly full", () => {
      useProjectStore.setState({
        currentProject: sampleProject,
        saveStatus: "saved",
        storageWarning: "Storage is 85% full. Please export projects.",
        isSaving: false,
      });

      render(<CanvasToolbar />);
      const warningBadge = screen.getByTestId("storage-warning-badge");
      expect(warningBadge).toBeInTheDocument();
      expect(warningBadge).toHaveTextContent("Storage 80%+");
      expect(warningBadge).toHaveAttribute("title", "Storage is 85% full. Please export projects.");
    });
  });

  // =========================================================================
  // 6. EDITOR PAGE ERROR RECOVERY SCREEN
  // =========================================================================
  describe("6. EditorPage Project Load Error Recovery Screen", () => {
    it("renders rich recovery card with error description, retry button, and JSON restore option", async () => {
      vi.spyOn(useProjectStore.getState(), "loadProject").mockImplementation(async () => {
        useProjectStore.setState({
          currentProject: null,
          isLoading: false,
          error: "Project data integrity check failed (corrupted storage).",
        });
      });

      await act(async () => {
        render(<EditorPage />);
      });

      expect(screen.getByTestId("project-load-error-container")).toBeInTheDocument();
      expect(screen.getByText("Unable to Load Project")).toBeInTheDocument();
      expect(screen.getByText("Project data integrity check failed (corrupted storage).")).toBeInTheDocument();
      expect(screen.getByTestId("error-retry-button")).toBeInTheDocument();
      expect(screen.getByTestId("error-restore-backup-button")).toBeInTheDocument();
      expect(screen.getByText("Return to Dashboard")).toBeInTheDocument();
    });

    it("triggers loadProject when 'Retry Loading' is clicked", async () => {
      const loadProjectSpy = vi.spyOn(useProjectStore.getState(), "loadProject").mockImplementation(async () => {
        useProjectStore.setState({
          currentProject: null,
          isLoading: false,
          error: "Project not found in storage",
        });
      });

      await act(async () => {
        render(<EditorPage />);
      });

      loadProjectSpy.mockClear();

      const retryBtn = screen.getByTestId("error-retry-button");
      fireEvent.click(retryBtn);

      expect(loadProjectSpy).toHaveBeenCalledWith("test-persistence-project");
    });
  });
});
