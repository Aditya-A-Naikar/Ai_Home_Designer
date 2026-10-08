import { describe, it, expect, beforeEach } from 'vitest';
import { getMyHomeProject } from '@/core/domain/demo-project';
import { exportProjectToJson, parseProjectJson } from '@/core/export/json-exporter';
import { exportFloorToSvg } from '@/core/export/svg-blueprint-exporter';
import { projectRepository } from '@/infrastructure/persistence/local-storage-project-repository';

describe('Phase 6: Persistence, JSON Import/Export & SVG Blueprint Exporter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('JSON Exporter & Parser', () => {
    it('serializes a complete project into formatted JSON with metadata', () => {
      const myHome = getMyHomeProject();
      const json = exportProjectToJson(myHome);

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('My Home');
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.floors).toHaveLength(1);
      expect(parsed.floors[0].walls.length).toBeGreaterThan(0);
      expect(parsed.floors[0].rooms.length).toBe(3);
      expect(parsed.metadata.updatedAt).toBeDefined();
    });

    it('successfully parses valid project JSON and passes Zod schema validation', () => {
      const myHome = getMyHomeProject();
      const json = exportProjectToJson(myHome);
      const result = parseProjectJson(json);

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project?.id).toBe(myHome.id);
      expect(result.project?.name).toBe('My Home');
      expect(result.project?.floors[0].walls.length).toBe(myHome.floors[0].walls.length);
      expect(result.project?.floors[0].rooms.length).toBe(myHome.floors[0].rooms.length);
    });

    it('rejects invalid or malformed JSON syntax gracefully', () => {
      const result = parseProjectJson('{ "name": "Broken project", ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON parse error');
      expect(result.project).toBeUndefined();
    });

    it('rejects JSON that does not match the Project schema', () => {
      const invalidProject = {
        name: 'Missing fields project',
        schemaVersion: 999,
      };
      const result = parseProjectJson(JSON.stringify(invalidProject));
      expect(result.success).toBe(false);
      expect(result.error).toContain('Project schema validation failed');
      expect(result.project).toBeUndefined();
    });

    it('guarantees round-trip fidelity between export and parse', () => {
      const myHome = getMyHomeProject();
      const exported = exportProjectToJson(myHome);
      const parsedResult = parseProjectJson(exported);

      expect(parsedResult.success).toBe(true);
      const imported = parsedResult.project!;

      expect(imported.id).toBe(myHome.id);
      expect(imported.plotDimensions).toEqual(myHome.plotDimensions);
      expect(imported.settings).toEqual(myHome.settings);
      expect(imported.floors[0].walls.length).toBe(myHome.floors[0].walls.length);
      expect(imported.floors[0].rooms.length).toBe(myHome.floors[0].rooms.length);
    });
  });

  describe('SVG Blueprint Exporter', () => {
    it('generates a complete architectural SVG blueprint for a floor plan', () => {
      const myHome = getMyHomeProject();
      const svg = exportFloorToSvg(myHome, myHome.activeFloorId);

      expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('class="blueprint-bg"');
      expect(svg).toContain('class="grid-layer"');
      expect(svg).toContain('class="rooms-layer"');
      expect(svg).toContain('class="walls-layer"');
      expect(svg).toContain('class="dimensions-layer"');
      expect(svg).toContain('class="title-block"');
      expect(svg).toContain('My Home');
      expect(svg).toContain('Living Room');
      expect(svg).toContain('Bedroom');
      expect(svg).toContain('Bathroom');
      expect(svg).toContain('N</text>'); // North arrow indicator
      expect(svg.endsWith('</svg>')).toBe(true);
    });

    it('respects export options (dimensions, grid, title block toggles)', () => {
      const myHome = getMyHomeProject();
      const svgMinimal = exportFloorToSvg(myHome, myHome.activeFloorId, {
        showDimensions: false,
        showGrid: false,
        showTitleBlock: false,
      });

      expect(svgMinimal).not.toContain('class="grid-layer"');
      expect(svgMinimal).not.toContain('class="dimensions-layer"');
      expect(svgMinimal).not.toContain('class="title-block"');
      expect(svgMinimal).toContain('class="walls-layer"');
      expect(svgMinimal).toContain('class="rooms-layer"');
    });

    it('handles empty floors without crashing or throwing NaN', () => {
      const emptyProject = getMyHomeProject();
      emptyProject.floors[0].walls = [];
      emptyProject.floors[0].rooms = [];

      const svg = exportFloorToSvg(emptyProject, emptyProject.activeFloorId);
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).not.toContain('NaN');
      expect(svg.endsWith('</svg>')).toBe(true);
    });

    it('renders architectural schedules, metric graphic scale bar, and dynamic North arrow', () => {
      const myHome = getMyHomeProject();
      myHome.siteContext = {
        roadFacing: 'N',
        northAngleDegrees: 45,
        setbacks: { front: 3000, rear: 2000, left: 1500, right: 1500 },
      };
      const svg = exportFloorToSvg(myHome, myHome.activeFloorId);

      expect(svg).toContain('class="scale-bar"');
      expect(svg).toContain('GRAPHIC SCALE 1:100 METRIC');
      expect(svg).toContain('class="room-schedule-table"');
      expect(svg).toContain('ROOM SCHEDULE');
      expect(svg).toContain('rotate(45)');
    });
  });

  describe('Persistence Integration', () => {
    it('saves, exports, imports, and reloads through repository', async () => {
      const myHome = getMyHomeProject();
      await projectRepository.save(myHome);

      const exportedJson = exportProjectToJson(myHome);
      const parsed = parseProjectJson(exportedJson);
      expect(parsed.success).toBe(true);

      const modifiedProject = {
        ...parsed.project!,
        id: 'imported-project-123',
        name: 'Imported My Home Copy',
      };

      await projectRepository.save(modifiedProject);
      const loaded = await projectRepository.getById('imported-project-123');

      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('Imported My Home Copy');
      expect(loaded?.floors[0].rooms.length).toBe(3);
    });
  });
});
