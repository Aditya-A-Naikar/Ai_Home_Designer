import { describe, it, expect } from 'vitest';
import { build2BHKLayout, build1BHKLayout, buildLivingRoomSuite, buildBedroomSuite } from '@/core/ai/architectural-layouts';
import { generatePlanFromPrompt } from '@/core/ai/plan-generator';
import { Project } from '@/core/domain/types';

describe('Architectural Layout Generation Engine', () => {
  const floorId = 'floor-test-1';

  it('generates an architectural 2BHK layout with code-compliant rooms and furniture', () => {
    const layout = build2BHKLayout(floorId, 0, 0);

    expect(layout.walls.length).toBeGreaterThan(6);
    expect(layout.rooms.length).toBe(4);
    expect(layout.props.length).toBeGreaterThanOrEqual(5);

    const roomNames = layout.rooms.map(r => r.name);
    expect(roomNames).toContain('Living Room');
    expect(roomNames).toContain('Master Bedroom');
    expect(roomNames).toContain('Guest Bedroom');
    expect(roomNames).toContain('Dining & Kitchen');

    // TV and Sofa verification
    const tv = layout.props.find(p => p.propType === 'tv');
    const sofa = layout.props.find(p => p.propType === 'sofa');
    expect(tv).toBeDefined();
    expect(sofa).toBeDefined();
    expect(tv?.dimensions.width).toBe(1680); // 75" TV width
    expect(sofa?.shape).toBe('l_shape');

    // King and Queen beds
    const beds = layout.props.filter(p => p.propType === 'bed');
    expect(beds.length).toBe(2);

    // Dining table
    const dining = layout.props.find(p => p.propType === 'dining_table');
    expect(dining).toBeDefined();
  });

  it('generates an architectural 1BHK layout', () => {
    const layout = build1BHKLayout(floorId, 0, 0);

    expect(layout.walls.length).toBeGreaterThan(4);
    expect(layout.rooms.length).toBe(3);
    expect(layout.props.length).toBeGreaterThanOrEqual(4);
    expect(layout.totalAreaM2).toBe(55.2);
  });

  it('builds a standalone Living Room suite when requested on an empty floor', () => {
    const suite = buildLivingRoomSuite(floorId, 0, 0, 'tv_75', 'sofa_l_shape');

    expect(suite.rooms.length).toBe(1);
    expect(suite.rooms[0].name).toBe('Living Room');
    expect(suite.props.length).toBe(2);

    const tv = suite.props.find(p => p.propType === 'tv')!;
    const sofa = suite.props.find(p => p.propType === 'sofa')!;

    // Sofa is placed opposite TV with calibrated viewing distance (approx 3.0m = 3000mm)
    const dy = Math.abs(sofa.position.y - tv.position.y);
    expect(dy).toBeGreaterThanOrEqual(2800);
    expect(dy).toBeLessThanOrEqual(3500);
  });

  it('builds a standalone Bedroom suite when requested on an empty floor', () => {
    const suite = buildBedroomSuite(floorId, 0, 0, 'bed_king');

    expect(suite.rooms.length).toBe(1);
    expect(suite.rooms[0].name).toBe('Master Bedroom');
    const bed = suite.props.find(p => p.propType === 'bed')!;
    expect(bed).toBeDefined();
    expect(bed.name).toContain('King');
  });
});

describe('Natural Language Intent Parser with Autonomous Room Generation', () => {
  const createEmptyProject = (): Project => ({
    schemaVersion: 1,
    id: 'proj-empty',
    name: 'New Empty Home',
    plotDimensions: { width: 15000, depth: 15000 },
    settings: {
      preferredUnit: 'mm',
      unitSystem: 'metric',
      gridSize: 100,
      snapTolerance: 10,
      defaultWallThickness: 200,
      defaultCeilingHeight: 3000,
    },
    preferences: {
      style: 'modern',
      priorities: ['natural light'],
      constraints: ['vaastu compliant'],
      budgetTier: 'moderate',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activeFloorId: 'floor-1',
    floors: [
      {
        id: 'floor-1',
        projectId: 'proj-empty',
        level: 0,
        name: 'Ground Floor',
        elevation: 0,
        height: 3000,
        walls: [],
        rooms: [],
        props: [],
      },
    ],
  });

  it('handles "Build a 2BHK layout" by generating complete floor plan actions', () => {
    const project = createEmptyProject();
    const res = generatePlanFromPrompt('Build a complete 2BHK floor plan layout', project);

    expect(res.actions.length).toBeGreaterThan(10);
    expect(res.replaceFloor).toBe(true);
    expect(res.message).toContain('2BHK');

    const wallActions = res.actions.filter(a => a.type === 'add_wall');
    const roomActions = res.actions.filter(a => a.type === 'add_room');
    const propActions = res.actions.filter(a => a.type === 'add_prop');

    expect(wallActions.length).toBeGreaterThan(6);
    expect(roomActions.length).toBe(4);
    expect(propActions.length).toBeGreaterThanOrEqual(5);
  });

  it('autonomously constructs a Living Room suite when user requests 75" TV + Sofa on an empty floor', () => {
    const project = createEmptyProject();
    const res = generatePlanFromPrompt('Add a 75-inch TV and modern gray L-shaped sofa to the Living Room', project);

    expect(res.actions.length).toBeGreaterThan(4);
    const roomAction = res.actions.find(a => a.type === 'add_room');
    expect(roomAction?.room?.name).toBe('Living Room');

    const propActions = res.actions.filter(a => a.type === 'add_prop');
    expect(propActions.length).toBe(2);
    expect(res.placementSummary?.viewingDistanceM).toBe(3.0);
  });

  it('autonomously constructs a Master Bedroom suite when user requests King Bed on an empty floor', () => {
    const project = createEmptyProject();
    const res = generatePlanFromPrompt('Place a King size bed in the bedroom with nightstand clearance', project);

    expect(res.actions.length).toBeGreaterThan(4);
    const roomAction = res.actions.find(a => a.type === 'add_room');
    expect(roomAction?.room?.name).toBe('Master Bedroom');

    const propActions = res.actions.filter(a => a.type === 'add_prop');
    expect(propActions.some(p => p.prop?.propType === 'bed')).toBe(true);
  });

  it('clears canvas when requested', () => {
    const project = createEmptyProject();
    const res = generatePlanFromPrompt('Clear canvas please', project);

    expect(res.replaceFloor).toBe(true);
    expect(res.actions.length).toBe(0);
    expect(res.message).toContain('cleared');
  });

  it('provides detailed Neufert standards answer when asked', () => {
    const project = createEmptyProject();
    const res = generatePlanFromPrompt('What are Neufert ergonomic standards for TV viewing?', project);

    expect(res.message).toContain('Neufert');
    expect(res.message).toContain('38mm');
  });

  it('autonomously generates an Architectural Duplex Villa across Ground Floor and First Floor', () => {
    const project = createEmptyProject();
    const res = generatePlanFromPrompt('Build a duplex house with internal staircase and double height living room', project);

    expect(res.message).toContain('Duplex');
    expect(res.replaceFloor).toBe(true);

    const stairs = res.actions.filter(a => a.type === 'add_staircase');
    const voids = res.actions.filter(a => a.type === 'add_void');
    const columns = res.actions.filter(a => a.type === 'add_column');
    const rooms = res.actions.filter(a => a.type === 'add_room');
    const props = res.actions.filter(a => a.type === 'add_prop');

    // Both floors should have stairs (UP on G0, DN on F1)
    expect(stairs.length).toBe(2);
    // Double height void on first floor
    expect(voids.length).toBe(1);
    expect(voids[0].void?.name).toContain('DOUBLE HEIGHT');
    // RC columns grid (16 columns per floor = 32 columns)
    expect(columns.length).toBe(32);
    // Enclosed rooms across both floors
    expect(rooms.length).toBeGreaterThanOrEqual(10);
    // Props across both floors (sedan, 75" TV, sofa, king bed, sanitaryware, etc.)
    expect(props.length).toBeGreaterThanOrEqual(15);
  });
});
