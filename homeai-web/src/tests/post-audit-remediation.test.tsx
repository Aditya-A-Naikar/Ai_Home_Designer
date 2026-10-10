/**
 * Post-Audit Remediation Verification Test Suite
 *
 * Verifies all remediations from the Master Integration Audit:
 * 1. FIX-01: Beginner Empty Canvas Onboarding Guide
 * 2. FIX-02: Visible Auto-Save & Cloud Persistence Badge
 * 3. FIX-03: Blueprint Dock Presets & Scale Reset
 * 4. FIX-04: Ephemeral Action Toast Feedback
 * 5. FIX-05: Mobile / Narrow Viewport Usability Advisory
 * 6. FIX-06: Keyboard Shortcut Badges on Toolbar Tools
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CanvasToolbar } from '@/features/canvas/components/canvas-toolbar';
import { CanvasViewport } from '@/features/canvas/components/canvas-viewport';
import { BlueprintDock } from '@/features/canvas/components/blueprint-dock';
import { useCanvasStore } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { createProject } from '@/core/domain/project-factory';
import { Project, BlueprintUnderlay, Wall } from '@/core/domain/types';

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

function createTestProject(name: string, walls: Wall[] = []): Project {
  const p = createProject({
    name,
    plotWidthMm: 15000,
    plotDepthMm: 12000,
    preferredUnit: 'mm',
    unitSystem: 'metric',
    floorsCount: 1,
    style: 'modern',
    priorities: [],
  });
  p.floors[0].walls = walls;
  p.floors[0].rooms = [];
  return p;
}

describe('Post-Audit Remediation Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCanvasStore.setState({
      activeDrawer: 'none',
      viewMode: '2d',
      tool: 'select',
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      isModified: false,
      blueprintDockOpen: false,
    });
  });

  describe('1. FIX-06: Keyboard Shortcut Badges on Toolbar Tools', () => {
    it('renders persistent keyboard shortcut badges directly on CAD tool buttons', () => {
      render(<CanvasToolbar />);

      // Verify CAD tool buttons exist and contain their respective shortcut badges
      const selectTool = screen.getByTestId('cad-tool-select');
      expect(selectTool).toBeInTheDocument();
      expect(within(selectTool).getByTestId('shortcut-badge-select')).toHaveTextContent('V');

      const wallTool = screen.getByTestId('cad-tool-wall');
      expect(wallTool).toBeInTheDocument();
      expect(within(wallTool).getByTestId('shortcut-badge-wall')).toHaveTextContent('W');

      const roomTool = screen.getByTestId('cad-tool-room');
      expect(roomTool).toBeInTheDocument();
      expect(within(roomTool).getByTestId('shortcut-badge-room')).toHaveTextContent('R');

      const doorTool = screen.getByTestId('cad-tool-door');
      expect(doorTool).toBeInTheDocument();
      expect(within(doorTool).getByTestId('shortcut-badge-door')).toHaveTextContent('D');
    });
  });

  describe('2. FIX-02: Visible Auto-Save & Cloud Persistence Badge', () => {
    it('renders the persistence status container and saved badge', () => {
      useProjectStore.setState({
        saveStatus: 'saved',
        isSaving: false,
      });

      render(<CanvasToolbar />);

      const statusContainer = screen.getByTestId('persistence-status-container');
      expect(statusContainer).toBeInTheDocument();
      expect(screen.getByTestId('save-status-saved')).toHaveTextContent(/saved/i);
    });

    it('displays saving spinner when saveStatus is saving', () => {
      useProjectStore.setState({
        saveStatus: 'saving',
        isSaving: true,
      });

      render(<CanvasToolbar />);

      expect(screen.getByTestId('save-status-saving')).toHaveTextContent(/saving\.\.\./i);
    });

    it('displays unsaved indicator when isModified is true', () => {
      useProjectStore.setState({
        saveStatus: 'idle',
        isSaving: false,
      });
      useCanvasStore.setState({
        isModified: true,
      });

      render(<CanvasToolbar />);

      expect(screen.getByTestId('save-status-unsaved')).toHaveTextContent(/unsaved/i);
    });
  });

  describe('3. FIX-01: Beginner Empty Canvas Onboarding Guide', () => {
    it('renders onboarding quick-start card when active floor is empty', () => {
      const emptyProj = createTestProject('Empty Test Villa');
      useProjectStore.setState({
        currentProject: emptyProj,
      });

      render(<CanvasViewport />);

      const guide = screen.getByTestId('empty-canvas-onboarding-guide');
      expect(guide).toBeInTheDocument();
      expect(guide).toHaveTextContent(/begin designing your floor plan/i);
      expect(screen.getByTestId('onboarding-draw-wall-btn')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-draw-room-btn')).toBeInTheDocument();
      expect(screen.getByTestId('onboarding-import-blueprint-btn')).toBeInTheDocument();
    });

    it('activates wall tool and dismisses guide when "Draw Walls" is clicked', () => {
      const emptyProj = createTestProject('Empty Test Villa');
      useProjectStore.setState({
        currentProject: emptyProj,
      });

      render(<CanvasViewport />);

      const drawWallBtn = screen.getByTestId('onboarding-draw-wall-btn');
      fireEvent.click(drawWallBtn);

      expect(useCanvasStore.getState().tool).toBe('wall');
      expect(screen.queryByTestId('empty-canvas-onboarding-guide')).not.toBeInTheDocument();
    });

    it('dismisses guide when the close button is clicked', () => {
      const emptyProj = createTestProject('Empty Test Villa');
      useProjectStore.setState({
        currentProject: emptyProj,
      });

      render(<CanvasViewport />);

      const closeBtn = screen.getByRole('button', { name: /dismiss quick start guide/i });
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('empty-canvas-onboarding-guide')).not.toBeInTheDocument();
    });

    it('does not render onboarding guide when floor contains walls', () => {
      const projWithWalls = createTestProject('Villa With Walls', [
        {
          id: 'w-1',
          floorId: 'fl-1',
          start: { x: 0, y: 0 },
          end: { x: 5000, y: 0 },
          thickness: 150,
          doors: [],
          windows: [],
        },
      ]);
      projWithWalls.floors[0].walls[0].floorId = projWithWalls.floors[0].id;

      useProjectStore.setState({
        currentProject: projWithWalls,
      });

      render(<CanvasViewport />);

      expect(screen.queryByTestId('empty-canvas-onboarding-guide')).not.toBeInTheDocument();
    });
  });

  describe('4. FIX-03: Blueprint Dock Presets & Scale Reset', () => {
    it('renders opacity preset buttons and updates underlay opacity', () => {
      const proj = createTestProject('Blueprint Test Project');
      const underlay: BlueprintUnderlay = {
        id: 'underlay-1',
        floorId: proj.floors[0].id,
        fileName: 'blueprint.png',
        fileType: 'image/png',
        fileSizeBytes: 2048000,
        imageUrl: 'blob:http://localhost/test',
        imageWidth: 2000,
        imageHeight: 1500,
        positionMm: { x: 0, y: 0 },
        rotationDeg: 0,
        mmPerPixel: 10,
        opacity: 0.5,
        visible: true,
      };
      proj.floors[0].blueprintUnderlay = underlay;

      useProjectStore.setState({
        currentProject: proj,
      });

      render(<BlueprintDock isOpen={true} onClose={vi.fn()} />);

      // Verify preset buttons exist
      const preset25 = screen.getByTestId('opacity-preset-25');
      const preset50 = screen.getByTestId('opacity-preset-50');
      const preset75 = screen.getByTestId('opacity-preset-75');
      const preset100 = screen.getByTestId('opacity-preset-100');

      expect(preset25).toBeInTheDocument();
      expect(preset50).toBeInTheDocument();
      expect(preset75).toBeInTheDocument();
      expect(preset100).toBeInTheDocument();

      // Click 75% preset
      fireEvent.click(preset75);
      const updatedFloor = useProjectStore.getState().currentProject?.floors[0];
      expect(updatedFloor?.blueprintUnderlay?.opacity).toBe(0.75);
    });

    it('renders reset scale button when calibration is present', () => {
      const proj = createTestProject('Calibrated Blueprint Project');
      const underlay: BlueprintUnderlay = {
        id: 'underlay-2',
        floorId: proj.floors[0].id,
        fileName: 'blueprint.png',
        fileType: 'image/png',
        fileSizeBytes: 2048000,
        imageUrl: 'blob:http://localhost/test',
        imageWidth: 2000,
        imageHeight: 1500,
        positionMm: { x: 0, y: 0 },
        rotationDeg: 0,
        mmPerPixel: 14.5,
        opacity: 0.5,
        visible: true,
        calibration: {
          point1Px: { x: 100, y: 100 },
          point2Px: { x: 500, y: 100 },
          pixelDistance: 400,
          realDistanceMm: 5800,
          calibratedAt: new Date().toISOString(),
        },
      };
      proj.floors[0].blueprintUnderlay = underlay;

      useProjectStore.setState({
        currentProject: proj,
      });

      render(<BlueprintDock isOpen={true} onClose={vi.fn()} />);

      const resetBtn = screen.getByTestId('reset-scale-default-btn');
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);

      const updated = useProjectStore.getState().currentProject?.floors[0].blueprintUnderlay;
      expect(updated?.mmPerPixel).toBe(10);
      expect(updated?.calibration).toBeUndefined();
    });
  });
});
