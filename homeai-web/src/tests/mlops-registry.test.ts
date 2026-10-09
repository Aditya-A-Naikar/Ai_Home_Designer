import { describe, it, expect } from "vitest";
import { 
  MODEL_REGISTRY, 
  evaluateModelGate, 
  getProductionTelemetrySnapshot,
  RegisteredModelVersion
} from "../core/ai/mlops-registry";

describe("MLOps Model Registry & Production Quality Gates", () => {
  it("maintains versioned models with valid SHA-256 hashes, dataset lineage, and metrics", () => {
    expect(MODEL_REGISTRY.length).toBeGreaterThanOrEqual(3);

    for (const model of MODEL_REGISTRY) {
      expect(model.modelId).toBeTruthy();
      expect(model.version).toBeTruthy();
      expect(model.architecture).toBeTruthy();
      expect(model.datasetLicense).toBeTruthy();
      expect(model.sha256Checksum).toHaveLength(64);
      expect(model.metrics).toBeDefined();
      expect(model.metrics.accuracyOrMAP).toBeGreaterThan(0);
      expect(model.metrics.regressionRate).toBe(0);
    }
  });

  it("passes evaluation gate for qualified production candidate", () => {
    const qualifiedModel = MODEL_REGISTRY.find(m => m.modelId === "plan-vision-yolo")!;
    expect(qualifiedModel).toBeDefined();

    const gateResult = evaluateModelGate(qualifiedModel);
    expect(gateResult.passed).toBe(true);
    expect(gateResult.blockers).toHaveLength(0);
    expect(gateResult.gateChecks.every(c => c.passed)).toBe(true);
  });

  it("fails evaluation gate when accuracy drops below threshold or regressions occur", () => {
    const degradedCandidate: RegisteredModelVersion = {
      modelId: "test-failing-candidate",
      name: "Substandard Model",
      version: "v0.9.0-bad",
      task: "Test Task",
      architecture: "Test Arch",
      datasetName: "Unclean Blueprints",
      datasetVersion: "v0.1",
      datasetLicense: "Unverified / Unknown Web Scraping",
      sha256Checksum: "12345", // Invalid checksum length
      parametersCount: "10M",
      status: "staged",
      metrics: {
        accuracyOrMAP: 0.72, // Below 0.88 threshold
        f1Score: 0.70,
        latencyP95Ms: 1200, // Exceeds 800ms
        constraintViolationRate: 0.08, // Exceeds 0.02
        regressionRate: 4, // Regressions > 0
      },
      createdAt: new Date().toISOString(),
    };

    const gateResult = evaluateModelGate(degradedCandidate);
    expect(gateResult.passed).toBe(false);
    expect(gateResult.blockers.length).toBeGreaterThanOrEqual(4);
    expect(gateResult.blockers.some(b => b.includes("Accuracy / mAP"))).toBe(true);
    expect(gateResult.blockers.some(b => b.includes("P95 Inference Latency"))).toBe(true);
    expect(gateResult.blockers.some(b => b.includes("Zero Regression Check"))).toBe(true);
    expect(gateResult.blockers.some(b => b.includes("SHA-256 Checksum"))).toBe(true);
    expect(gateResult.blockers.some(b => b.includes("Commercial License"))).toBe(true);
  });

  it("returns real-time telemetry snapshot with zero fatal alerts and active uptime", () => {
    const telemetry = getProductionTelemetrySnapshot();
    expect(telemetry.activeProductionModels).toBeGreaterThan(0);
    expect(telemetry.averageLatencyMs).toBeLessThan(500);
    expect(telemetry.uptimePercent).toBeGreaterThan(99.0);
    expect(telemetry.driftAlertActive).toBe(false);
    expect(telemetry.constraintViolationsBlocked).toBeGreaterThanOrEqual(0);
  });
});
