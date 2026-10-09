import { describe, it, expect } from "vitest";
import { 
  queryArchitecturalRAG, 
  ARCHITECTURAL_KNOWLEDGE_BASE 
} from "../core/ai/architectural-knowledge-rag";

describe("Trustworthy Architectural Knowledge RAG", () => {
  it("contains verified statutory building codes and Neufert ergonomic standards", () => {
    expect(ARCHITECTURAL_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(10);

    for (const clause of ARCHITECTURAL_KNOWLEDGE_BASE) {
      expect(clause.id).toBeTruthy();
      expect(clause.jurisdiction).toBeTruthy();
      expect(clause.standardName).toBeTruthy();
      expect(clause.clauseNumber).toBeTruthy();
      expect(clause.citation).toBeTruthy();
      expect(clause.requirementText).toBeTruthy();
    }
  });

  it("retrieves Neufert TV viewing distance and bed clearance ergonomics", () => {
    const result = queryArchitecturalRAG({
      query: "optimal TV viewing distance ocular strain",
      jurisdiction: "universal_neufert",
    });

    expect(result.clauses.length).toBeGreaterThanOrEqual(1);
    expect(result.clauses[0].title).toContain("TV Viewing");
    expect(result.synthesizedAnswer).toContain("38mm per screen diagonal inch");
    expect(result.synthesizedAnswer).toContain("Neufert Architect's Data");
  });

  it("retrieves Indian NBC 2016 statutory staircase riser and tread limits", () => {
    const result = queryArchitecturalRAG({
      query: "staircase riser tread minimum maximum residential",
      jurisdiction: "india_nbc",
    });

    expect(result.clauses.length).toBeGreaterThanOrEqual(1);
    const stairClause = result.clauses.find(c => c.category === "staircase");
    expect(stairClause).toBeDefined();
    expect(stairClause?.requirementText).toContain("190mm");
    expect(stairClause?.isMandatory).toBe(true);
    expect(result.mandatoryRuleCount).toBeGreaterThanOrEqual(1);
  });

  it("retrieves IBC 2021 egress corridor clearances", () => {
    const result = queryArchitecturalRAG({
      query: "corridor egress width occupant clear passage",
      jurisdiction: "international_ibc",
    });

    expect(result.clauses.length).toBeGreaterThanOrEqual(1);
    expect(result.clauses[0].standardName).toContain("International Building Code");
    expect(result.clauses[0].requirementText).toContain("914mm");
  });

  it("retrieves Vaastu Shastra orientation guidelines", () => {
    const result = queryArchitecturalRAG({
      query: "kitchen fire southeast agneya vastu orientation",
      jurisdiction: "vaastu_shastra",
    });

    expect(result.clauses.length).toBeGreaterThanOrEqual(1);
    expect(result.clauses[0].title).toContain("Kitchen");
    expect(result.clauses[0].requirementText).toContain("South-East");
  });

  it("falls back gracefully when querying an unknown or obscure topic", () => {
    const result = queryArchitecturalRAG({
      query: "quantum warp reactor antigravity teleportation",
    });

    expect(result.confidence).toBeLessThan(0.9);
    expect(result.synthesizedAnswer).toContain("universal Ernst Neufert human ergonomic clearances");
  });
});
