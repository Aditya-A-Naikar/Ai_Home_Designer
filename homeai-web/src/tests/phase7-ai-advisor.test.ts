import { describe, it, expect } from 'vitest';
import { getMyHomeProject } from '@/core/domain/demo-project';
import { auditFloorPlan } from '@/core/ai/architect-rules';

describe('Phase 7: AI Design Advisor — Architectural Code & Ergonomics Engine', () => {
  it('audits a valid project and computes overall score and category breakdown', () => {
    const project = getMyHomeProject();
    const report = auditFloorPlan(project);

    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(['compliant', 'minor_issues', 'action_required']).toContain(report.complianceStatus);

    expect(report.categoryScores.building_code).toBeDefined();
    expect(report.categoryScores.ventilation).toBeDefined();
    expect(report.categoryScores.egress).toBeDefined();
    expect(report.categoryScores.ergonomics).toBeDefined();
    expect(report.categoryScores.vaastu).toBeDefined();

    expect(report.stats.roomCount).toBe(3);
    expect(report.stats.totalAreaM2).toBeCloseTo(63.0, 1);
  });

  it('detects undersized rooms according to NBC/IBC standards', () => {
    const project = getMyHomeProject();
    // Intentionally create a tiny bedroom of 4.0 m² (< 9.5 m² NBC minimum)
    const floor = project.floors[0];
    const tinyRoom = {
      id: 'room-tiny-bed',
      floorId: floor.id,
      name: 'Tiny Bedroom',
      polygon: [
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
        { x: 2000, y: 2000 },
        { x: 0, y: 2000 },
      ], // 4.0 m²
    };
    floor.rooms.push(tinyRoom);

    const report = auditFloorPlan(project);
    const areaIssue = report.issues.find(i => i.title.includes('Undersized Tiny Bedroom'));

    expect(areaIssue).toBeDefined();
    expect(areaIssue?.category).toBe('building_code');
    expect(areaIssue?.severity).toBe('warning');
    expect(areaIssue?.description).toContain('4.0 m²');
  });

  it('detects insufficient natural ventilation (<10% glazing ratio) and provides auto-fix suggestions', () => {
    const project = getMyHomeProject();
    // Strip windows from one of the bedrooms to create daylight deficiency
    const floor = project.floors[0];
    floor.walls.forEach(w => {
      w.windows = [];
    });

    const report = auditFloorPlan(project);
    const ventIssues = report.issues.filter(i => i.category === 'ventilation');
    expect(ventIssues.length).toBeGreaterThan(0);

    // Should generate actionable window addition suggestion
    const windowSuggestions = report.suggestions.filter(s => s.action?.type === 'add_window');
    expect(windowSuggestions.length).toBeGreaterThan(0);
    const firstSug = windowSuggestions[0];
    expect(firstSug.action?.params.width).toBeGreaterThanOrEqual(1000);
    expect(firstSug.codeReference).toBe('NBC Clause 4.2');
  });

  it('audits door widths for universal egress compliance and flags narrow doors', () => {
    const project = getMyHomeProject();
    const floor = project.floors[0];
    // Add a narrow 650mm door (below 800mm NBC minimum)
    floor.walls[0].doors.push({
      id: 'door-narrow-test',
      wallId: floor.walls[0].id,
      floorId: floor.id,
      offset: 1000,
      width: 650,
      height: 2100,
      swingDirection: 'inward_right',
    });

    const report = auditFloorPlan(project);
    const doorIssue = report.issues.find(i => i.id === 'issue-door-door-narrow-test');

    expect(doorIssue).toBeDefined();
    expect(doorIssue?.category).toBe('egress');
    expect(doorIssue?.description).toContain('650mm');

    const doorSuggestion = report.suggestions.find(s => s.action?.doorId === 'door-narrow-test');
    expect(doorSuggestion).toBeDefined();
    expect(doorSuggestion?.action?.type).toBe('widen_door');
    expect(doorSuggestion?.action?.params.width).toBe(900);
  });

  it('evaluates TV and sofa viewing distance ergonomics', () => {
    const project = getMyHomeProject();
    const floor = project.floors[0];
    
    // Add a 75-inch TV and sofa placed 1.0m away (too close for a 75" TV)
    floor.props = [
      {
        id: 'prop-tv-test',
        floorId: floor.id,
        roomId: 'room-myhome-living',
        name: '75" 4K TV',
        category: 'entertainment',
        propType: 'tv',
        position: { x: 2500, y: 500 },
        rotation: 0,
        dimensions: { width: 1680, depth: 100 },
        specifications: { screenSizeInches: 75 },
      },
      {
        id: 'prop-sofa-test',
        floorId: floor.id,
        roomId: 'room-myhome-living',
        name: 'Sofa',
        category: 'living',
        propType: 'sofa',
        position: { x: 2500, y: 1500 }, // only 1.0m away!
        rotation: 180,
        dimensions: { width: 2200, depth: 900 },
      },
    ];

    const report = auditFloorPlan(project);
    const tvErgoIssue = report.issues.find(i => i.category === 'ergonomics' && i.title.includes('TV Ergonomics'));

    expect(tvErgoIssue).toBeDefined();
    expect(tvErgoIssue?.description).toContain('1.0m');
  });
});
