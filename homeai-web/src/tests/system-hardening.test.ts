import { describe, it, expect, beforeEach } from "vitest";
import { sanitizeText, sanitizeProjectName, sanitizeRoomName } from "@/core/security/sanitizer";
import { computeChecksum, safeSaveProject, safeLoadProject } from "@/core/storage/storage-hardening";
import { RateLimiter } from "@/core/security/rate-limiter";
import { Project } from "@/core/domain/types";

describe("Phase 13: System Security, Storage & Performance Hardening", () => {
  describe("Input Sanitizer", () => {
    it("strips malicious script tags and HTML injection", () => {
      const malicious = "<script>alert('xss')</script>Villa <img src=x onerror=alert(1)>Modern";
      const clean = sanitizeText(malicious);
      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("<img");
      expect(clean).toBe("Villa Modern");
    });

    it("sanitizes project name and provides fallback", () => {
      expect(sanitizeProjectName("")).toBe("Untitled Architectural Project");
      expect(sanitizeProjectName("   Skyline Duplex   ")).toBe("Skyline Duplex");
      expect(sanitizeRoomName("   Living Room   ")).toBe("Living Room");
    });
  });

  describe("Storage Hardening & Checksums", () => {
    const mockProject: Project = {
      schemaVersion: 1,
      id: "test-prj-hardened",
      name: "Hardened Residence",
      plotDimensions: { width: 10000, depth: 10000 },
      settings: {
        unitSystem: "metric",
        preferredUnit: "m",
        gridSize: 100,
        snapTolerance: 10,
        defaultWallThickness: 200,
        defaultCeilingHeight: 3000,
      },
      preferences: {
        style: "modern",
        priorities: ["light"],
        constraints: [],
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      activeFloorId: "fl-1",
      floors: [],
    };

    beforeEach(() => {
      localStorage.clear();
    });

    it("computes deterministic integer checksums", () => {
      const cs1 = computeChecksum("Hello CAD World");
      const cs2 = computeChecksum("Hello CAD World");
      const cs3 = computeChecksum("Different string");
      expect(cs1).toBe(cs2);
      expect(cs1).not.toBe(cs3);
    });

    it("safely saves and loads project with checksum validation", () => {
      const saveRes = safeSaveProject(mockProject);
      expect(saveRes.success).toBe(true);

      const loadRes = safeLoadProject(mockProject.id);
      expect(loadRes.success).toBe(true);
      expect(loadRes.data?.name).toBe("Hardened Residence");
    });

    it("detects corrupted storage tampering", () => {
      safeSaveProject(mockProject);
      const key = `homeai_project_${mockProject.id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.checksum = 9999999; // Tamper with checksum
        localStorage.setItem(key, JSON.stringify(parsed));
      }

      const loadRes = safeLoadProject(mockProject.id);
      expect(loadRes.success).toBe(false);
      expect(loadRes.error).toContain("integrity check failed");
    });
  });

  describe("Rate Limiter", () => {
    it("allows tokens up to maximum capacity and rejects when exhausted", () => {
      const limiter = new RateLimiter(3, 0); // 3 tokens, 0 refill
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false); // Exhausted
    });
  });
});
