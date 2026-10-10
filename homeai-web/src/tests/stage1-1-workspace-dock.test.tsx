import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useCanvasStore, ActiveDrawer } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { getDemoProject } from '@/core/domain/demo-project';
import { ArchitecturalNavSidebar } from '@/features/canvas/components/architectural-nav-sidebar';
import { FurnitureCatalogDock } from '@/features/canvas/components/furniture-catalog-dock';
import { MaterialsColorsDock } from '@/features/canvas/components/materials-colors-dock';
import { PropertiesPanel } from '@/features/canvas/components/properties-panel';
import { AIAdvisorPanel } from '@/features/ai-advisor/components/ai-advisor-panel';

vi.mock('next/navigation', () => ({
  usePathname: () => '/editor/test-project',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Level 1 - Stage 1.1: Single-Active-Dock Workspace Architecture & Responsive Stabilization', () => {
  beforeEach(() => {
    // Reset canvas store to baseline
    const store = useCanvasStore.getState();
    store.closeDrawer();
    store.setViewMode('2d');
    store.setTool('select');
    store.selectElement(null);
    store.selectSubElement(null);

    // Polyfill scrollIntoView for JSDOM
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    // Initialize project store with demo project for subcomponents
    const demo = getDemoProject();
    useProjectStore.setState({
      currentProject: demo,
      past: [],
      future: [],
    });
  });

  describe('1. Drawer Mutual Exclusion & Single Source of Truth', () => {
    it('initializes with activeDrawer = "none" and all legacy flags as false', () => {
      const state = useCanvasStore.getState();
      expect(state.activeDrawer).toBe('none');
      expect(state.catalogDockOpen).toBe(false);
      expect(state.materialsDockOpen).toBe(false);
      expect(state.leftSidebarOpen).toBe(false);
      expect(state.aiAdvisorOpen).toBe(false);
    });

    it('enforces strict mutual exclusion when activating catalog drawer', () => {
      const { setActiveDrawer } = useCanvasStore.getState();

      setActiveDrawer('catalog');
      const state = useCanvasStore.getState();

      expect(state.activeDrawer).toBe('catalog');
      expect(state.catalogDockOpen).toBe(true);
      expect(state.materialsDockOpen).toBe(false);
      expect(state.leftSidebarOpen).toBe(false);
      expect(state.aiAdvisorOpen).toBe(false);
    });

    it('enforces strict mutual exclusion when transitioning from catalog to materials', () => {
      const { setActiveDrawer } = useCanvasStore.getState();

      setActiveDrawer('catalog');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');

      setActiveDrawer('materials');
      const state = useCanvasStore.getState();
      expect(state.activeDrawer).toBe('materials');
      expect(state.materialsDockOpen).toBe(true);
      expect(state.catalogDockOpen).toBe(false);
      expect(state.leftSidebarOpen).toBe(false);
      expect(state.aiAdvisorOpen).toBe(false);
    });

    it('enforces strict mutual exclusion when transitioning to properties and then to AI advisor', () => {
      const { setActiveDrawer } = useCanvasStore.getState();

      setActiveDrawer('properties');
      let state = useCanvasStore.getState();
      expect(state.activeDrawer).toBe('properties');
      expect(state.leftSidebarOpen).toBe(true);
      expect(state.catalogDockOpen).toBe(false);
      expect(state.materialsDockOpen).toBe(false);
      expect(state.aiAdvisorOpen).toBe(false);

      setActiveDrawer('ai');
      state = useCanvasStore.getState();
      expect(state.activeDrawer).toBe('ai');
      expect(state.aiAdvisorOpen).toBe(true);
      expect(state.leftSidebarOpen).toBe(false);
      expect(state.catalogDockOpen).toBe(false);
      expect(state.materialsDockOpen).toBe(false);
    });

    it('toggleDrawer closes the active drawer if the same drawer is requested', () => {
      const { toggleDrawer } = useCanvasStore.getState();

      toggleDrawer('catalog');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');

      toggleDrawer('catalog');
      expect(useCanvasStore.getState().activeDrawer).toBe('none');
      expect(useCanvasStore.getState().catalogDockOpen).toBe(false);
    });

    it('toggleDrawer switches to a different drawer if another is requested', () => {
      const { toggleDrawer } = useCanvasStore.getState();

      toggleDrawer('catalog');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');

      toggleDrawer('materials');
      expect(useCanvasStore.getState().activeDrawer).toBe('materials');
      expect(useCanvasStore.getState().catalogDockOpen).toBe(false);
      expect(useCanvasStore.getState().materialsDockOpen).toBe(true);
    });

    it('closeDrawer closes whichever drawer is open without affecting other settings', () => {
      const { setActiveDrawer, closeDrawer, setViewMode } = useCanvasStore.getState();

      setViewMode('3d');
      setActiveDrawer('ai');
      expect(useCanvasStore.getState().activeDrawer).toBe('ai');

      closeDrawer();
      const state = useCanvasStore.getState();
      expect(state.activeDrawer).toBe('none');
      expect(state.viewMode).toBe('3d');
      expect(state.aiAdvisorOpen).toBe(false);
    });

    it('backward-compatibility setters correctly update activeDrawer as single source of truth', () => {
      const { setCatalogDockOpen, setMaterialsDockOpen, setLeftSidebarOpen, setAIAdvisorOpen } = useCanvasStore.getState();

      setCatalogDockOpen(true);
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');
      expect(useCanvasStore.getState().catalogDockOpen).toBe(true);

      setMaterialsDockOpen(true);
      expect(useCanvasStore.getState().activeDrawer).toBe('materials');
      expect(useCanvasStore.getState().catalogDockOpen).toBe(false);
      expect(useCanvasStore.getState().materialsDockOpen).toBe(true);

      setLeftSidebarOpen(true);
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');
      expect(useCanvasStore.getState().leftSidebarOpen).toBe(true);
      expect(useCanvasStore.getState().materialsDockOpen).toBe(false);

      setAIAdvisorOpen(true);
      expect(useCanvasStore.getState().activeDrawer).toBe('ai');
      expect(useCanvasStore.getState().aiAdvisorOpen).toBe(true);
      expect(useCanvasStore.getState().leftSidebarOpen).toBe(false);

      setAIAdvisorOpen(false);
      expect(useCanvasStore.getState().activeDrawer).toBe('none');
      expect(useCanvasStore.getState().aiAdvisorOpen).toBe(false);
    });
  });

  describe('2. Persistent Navigation Sidebar Independence', () => {
    it('navigation sidebar collapsed state remains fully independent from contextual drawers', () => {
      let navCollapsed = false;
      const setNavCollapsed = (val: boolean) => { navCollapsed = val; };

      const { setActiveDrawer } = useCanvasStore.getState();

      // Open drawer while nav is expanded
      setActiveDrawer('catalog');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');
      expect(navCollapsed).toBe(false);

      // Collapse nav: activeDrawer must remain 'catalog'
      setNavCollapsed(true);
      expect(navCollapsed).toBe(true);
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');

      // Close drawer: nav must remain collapsed
      useCanvasStore.getState().closeDrawer();
      expect(useCanvasStore.getState().activeDrawer).toBe('none');
      expect(navCollapsed).toBe(true);

      // Re-expand nav: activeDrawer remains 'none'
      setNavCollapsed(false);
      expect(navCollapsed).toBe(false);
      expect(useCanvasStore.getState().activeDrawer).toBe('none');
    });
  });

  describe('3. Responsive Workspace Breakpoint & Math Floor Guarantee (> 700px)', () => {
    const DOCK_WIDTH_PX = 320;
    const BREAKPOINT_PX = 1024;
    const MIN_CANVAS_FLOOR_PX = 700;

    const computeLayout = (viewportWidth: number, navCollapsed: boolean, activeDrawer: ActiveDrawer) => {
      const navWidth = navCollapsed ? 64 : 224;
      const workspaceWidth = viewportWidth - navWidth;
      const isDocked = workspaceWidth >= BREAKPOINT_PX;
      const hasActiveDock = activeDrawer !== 'none';

      let canvasWidth: number;
      let isOverlay: boolean;

      if (isDocked) {
        isOverlay = false;
        canvasWidth = hasActiveDock ? workspaceWidth - DOCK_WIDTH_PX : workspaceWidth;
      } else {
        isOverlay = hasActiveDock;
        // In overlay mode, the drawer does NOT reduce the canvas width
        canvasWidth = workspaceWidth;
      }

      return {
        workspaceWidth,
        isDocked,
        isOverlay,
        canvasWidth,
      };
    };

    it('verifies mathematical invariant: docked canvas is always > 700px whenever workspace >= 1024px', () => {
      // Minimum possible workspace width in docked mode is exactly 1024px
      const minDockedCanvas = BREAKPOINT_PX - DOCK_WIDTH_PX;
      expect(minDockedCanvas).toBe(704);
      expect(minDockedCanvas).toBeGreaterThan(MIN_CANVAS_FLOOR_PX);
    });

    it('handles 1024x768 display: triggers overlay mode and preserves canvas width without squeezing', () => {
      // Expanded nav (224px): workspace = 1024 - 224 = 800px < 1024px -> overlay mode
      const expandedLayout = computeLayout(1024, false, 'catalog');
      expect(expandedLayout.workspaceWidth).toBe(800);
      expect(expandedLayout.isDocked).toBe(false);
      expect(expandedLayout.isOverlay).toBe(true);
      expect(expandedLayout.canvasWidth).toBe(800);
      expect(expandedLayout.canvasWidth).toBeGreaterThan(MIN_CANVAS_FLOOR_PX);

      // Collapsed nav (64px): workspace = 1024 - 64 = 960px < 1024px -> overlay mode
      const collapsedLayout = computeLayout(1024, true, 'catalog');
      expect(collapsedLayout.workspaceWidth).toBe(960);
      expect(collapsedLayout.isDocked).toBe(false);
      expect(collapsedLayout.isOverlay).toBe(true);
      expect(collapsedLayout.canvasWidth).toBe(960);
      expect(collapsedLayout.canvasWidth).toBeGreaterThan(MIN_CANVAS_FLOOR_PX);
    });

    it('handles 1280x800 display: docks in-flow with canvas > 700px', () => {
      // Expanded nav (224px): workspace = 1280 - 224 = 1056px >= 1024px -> docked mode
      const layout = computeLayout(1280, false, 'materials');
      expect(layout.workspaceWidth).toBe(1056);
      expect(layout.isDocked).toBe(true);
      expect(layout.isOverlay).toBe(false);
      expect(layout.canvasWidth).toBe(1056 - 320); // 736px
      expect(layout.canvasWidth).toBe(736);
      expect(layout.canvasWidth).toBeGreaterThan(MIN_CANVAS_FLOOR_PX);
    });

    it('handles 1440x900 display: docks in-flow with generous canvas width', () => {
      const layout = computeLayout(1440, false, 'properties');
      expect(layout.workspaceWidth).toBe(1216);
      expect(layout.isDocked).toBe(true);
      expect(layout.isOverlay).toBe(false);
      expect(layout.canvasWidth).toBe(1216 - 320); // 896px
      expect(layout.canvasWidth).toBe(896);
      expect(layout.canvasWidth).toBeGreaterThan(MIN_CANVAS_FLOOR_PX);
    });

    it('handles 1920x1080 display: docks in-flow with 1376px canvas width', () => {
      const layout = computeLayout(1920, false, 'ai');
      expect(layout.workspaceWidth).toBe(1696);
      expect(layout.isDocked).toBe(true);
      expect(layout.isOverlay).toBe(false);
      expect(layout.canvasWidth).toBe(1696 - 320); // 1376px
      expect(layout.canvasWidth).toBe(1376);
      expect(layout.canvasWidth).toBeGreaterThan(MIN_CANVAS_FLOOR_PX);
    });
  });

  describe('4. Keyboard & Escape Key Dismissal Semantics', () => {
    it('pressing Escape dismisses active drawer when a drawer is open', () => {
      const { setActiveDrawer, closeDrawer, selectElement, setTool } = useCanvasStore.getState();

      setActiveDrawer('properties');
      setTool('wall');
      selectElement('wall-1');

      // Simulate Escape key behavior from page.tsx:
      // If activeDrawer !== 'none', closeDrawer() is called first
      if (useCanvasStore.getState().activeDrawer !== 'none') {
        closeDrawer();
      } else {
        setTool('select');
        selectElement(null);
      }

      // Drawer is closed
      expect(useCanvasStore.getState().activeDrawer).toBe('none');
      // Sub-elements or tool are not wiped on the first Escape if drawer was open
      expect(useCanvasStore.getState().selectedElementId).toBe('wall-1');
      expect(useCanvasStore.getState().tool).toBe('wall');

      // Second Escape when drawer is 'none' clears element selection & resets tool
      if (useCanvasStore.getState().activeDrawer !== 'none') {
        closeDrawer();
      } else {
        useCanvasStore.getState().setTool('select');
        useCanvasStore.getState().selectElement(null);
      }

      expect(useCanvasStore.getState().activeDrawer).toBe('none');
      expect(useCanvasStore.getState().selectedElementId).toBeNull();
      expect(useCanvasStore.getState().tool).toBe('select');
    });
  });

  describe('5. View Mode Switching (2D <-> 3D) & Stability', () => {
    it('switching viewMode between 2D and 3D preserves activeDrawer state', () => {
      const { setViewMode, setActiveDrawer } = useCanvasStore.getState();

      setActiveDrawer('materials');
      expect(useCanvasStore.getState().activeDrawer).toBe('materials');

      // Switch to 3D
      setViewMode('3d');
      expect(useCanvasStore.getState().viewMode).toBe('3d');
      expect(useCanvasStore.getState().activeDrawer).toBe('materials');

      // Switch to 2D
      setViewMode('2d');
      expect(useCanvasStore.getState().viewMode).toBe('2d');
      expect(useCanvasStore.getState().activeDrawer).toBe('materials');
    });

    it('selecting an element or sub-element does not reset or clobber activeDrawer', () => {
      const { setActiveDrawer, selectElement, selectSubElement } = useCanvasStore.getState();

      setActiveDrawer('properties');
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');

      selectElement('wall-123');
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');
      expect(useCanvasStore.getState().selectedElementId).toBe('wall-123');

      selectSubElement({ type: 'door', id: 'door-456', parentWallId: 'wall-123' });
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');
      expect(useCanvasStore.getState().selectedSubElement?.id).toBe('door-456');
    });

    it('changing CAD tools does not reset activeDrawer', () => {
      const { setActiveDrawer, setTool } = useCanvasStore.getState();

      setActiveDrawer('properties');
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');

      setTool('room');
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');
      expect(useCanvasStore.getState().tool).toBe('room');

      setTool('door');
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');
      expect(useCanvasStore.getState().tool).toBe('door');
    });
  });

  describe('6. DOM Component Rendering, Mutual Exclusion & Dismissal Interactions', () => {
    it('renders ArchitecturalNavSidebar and toggles activeDrawer on button clicks', () => {
      render(<ArchitecturalNavSidebar />);

      const catalogBtn = screen.getByRole('button', { name: /furniture & decor/i });
      const materialsBtn = screen.getByRole('button', { name: /materials & finishes/i });
      const propertiesBtn = screen.getByRole('button', { name: /properties & tools/i });
      const aiBtn = screen.getByRole('button', { name: /ai chat/i });

      // Click catalog
      fireEvent.click(catalogBtn);
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');

      // Click materials: mutual exclusion switches activeDrawer
      fireEvent.click(materialsBtn);
      expect(useCanvasStore.getState().activeDrawer).toBe('materials');

      // Click properties
      fireEvent.click(propertiesBtn);
      expect(useCanvasStore.getState().activeDrawer).toBe('properties');

      // Click AI
      fireEvent.click(aiBtn);
      expect(useCanvasStore.getState().activeDrawer).toBe('ai');

      // Click AI again: toggles off to 'none'
      fireEvent.click(aiBtn);
      expect(useCanvasStore.getState().activeDrawer).toBe('none');
    });

    it('ArchitecturalNavSidebar collapse toggle operates independently without modifying activeDrawer', () => {
      const { container } = render(<ArchitecturalNavSidebar />);
      const aside = container.querySelector('aside');
      expect(aside?.className).toContain('w-56');

      const collapseBtn = screen.getByTitle(/collapse sidebar/i);

      // Open a drawer first
      useCanvasStore.getState().setActiveDrawer('catalog');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog');

      // Collapse sidebar
      fireEvent.click(collapseBtn);
      expect(aside?.className).toContain('w-16');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog'); // remains unchanged!

      // Expand sidebar
      const expandBtn = screen.getByTitle(/expand sidebar/i);
      fireEvent.click(expandBtn);
      expect(aside?.className).toContain('w-56');
      expect(useCanvasStore.getState().activeDrawer).toBe('catalog'); // still unchanged!
    });

    it('FurnitureCatalogDock mounts with 320px width when active and unmounts on close click', () => {
      useCanvasStore.getState().setActiveDrawer('catalog');
      const { container } = render(<FurnitureCatalogDock />);

      expect(screen.getByText(/furniture & decor/i)).toBeDefined();
      const dock = container.firstChild as HTMLElement;
      expect(dock.className).toContain('w-80'); // 320px

      const closeBtn = screen.getByTitle(/close catalog/i);
      fireEvent.click(closeBtn);

      expect(useCanvasStore.getState().activeDrawer).toBe('none');
    });

    it('MaterialsColorsDock mounts with 320px width when active and unmounts on close click', () => {
      useCanvasStore.getState().setActiveDrawer('materials');
      const { container } = render(<MaterialsColorsDock />);

      expect(screen.getByText(/materials & finishes/i)).toBeDefined();
      const dock = container.firstChild as HTMLElement;
      expect(dock.className).toContain('w-80'); // 320px

      const closeBtn = screen.getByTitle(/close materials dock/i);
      fireEvent.click(closeBtn);

      expect(useCanvasStore.getState().activeDrawer).toBe('none');
    });

    it('PropertiesPanel mounts with 320px width when active and unmounts on close click', () => {
      useCanvasStore.getState().setActiveDrawer('properties');
      const { container } = render(<PropertiesPanel />);

      expect(screen.getByText(/cad workspace/i)).toBeDefined();
      const dock = container.firstChild as HTMLElement;
      expect(dock.className).toContain('w-80'); // 320px

      const closeBtn = screen.getByTitle(/collapse left sidebar/i);
      fireEvent.click(closeBtn);

      expect(useCanvasStore.getState().activeDrawer).toBe('none');
    });

    it('AIAdvisorPanel mounts with 320px width when active and does not mount when closed', () => {
      // When activeDrawer === 'none', must return null (no floating button)
      useCanvasStore.getState().setActiveDrawer('none');
      const { container: closedContainer } = render(<AIAdvisorPanel />);
      expect(closedContainer.firstChild).toBeNull();

      // When activeDrawer === 'ai', mounts with 320px width
      useCanvasStore.getState().setActiveDrawer('ai');
      const { container: openContainer } = render(<AIAdvisorPanel />);
      expect(openContainer.textContent).toContain('AI Architect Co-Pilot');
      const dock = openContainer.firstChild as HTMLElement;
      expect(dock.className).toContain('w-80'); // 320px

      const closeBtn = openContainer.querySelector('button[title*="Minimize"]') as HTMLButtonElement;
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);

      expect(useCanvasStore.getState().activeDrawer).toBe('none');
    });

    it('composite drawer container renders at most one contextual dock in DOM at any time', () => {
      const ContextualWorkstation = () => {
        const { activeDrawer } = useCanvasStore();
        return (
          <div data-testid="workstation-container">
            {activeDrawer === 'catalog' && <FurnitureCatalogDock />}
            {activeDrawer === 'materials' && <MaterialsColorsDock />}
            {activeDrawer === 'properties' && <PropertiesPanel />}
            {activeDrawer === 'ai' && <AIAdvisorPanel />}
          </div>
        );
      };

      const { rerender } = render(<ContextualWorkstation />);
      const containerEl = screen.getByTestId('workstation-container');

      // 1. None active -> 0 children
      expect(containerEl.children).toHaveLength(0);

      // 2. Open Catalog -> Exactly 1 child (Catalog)
      act(() => {
        useCanvasStore.getState().setActiveDrawer('catalog');
      });
      rerender(<ContextualWorkstation />);
      expect(containerEl.children).toHaveLength(1);
      expect(screen.getByText(/furniture & decor/i)).toBeDefined();
      expect(screen.queryByText(/materials & finishes/i)).toBeNull();

      // 3. Switch to Materials -> Exactly 1 child (Materials)
      act(() => {
        useCanvasStore.getState().setActiveDrawer('materials');
      });
      rerender(<ContextualWorkstation />);
      expect(containerEl.children).toHaveLength(1);
      expect(screen.getByText(/materials & finishes/i)).toBeDefined();
      expect(screen.queryByText(/furniture & decor/i)).toBeNull();

      // 4. Switch to Properties -> Exactly 1 child (Properties)
      act(() => {
        useCanvasStore.getState().setActiveDrawer('properties');
      });
      rerender(<ContextualWorkstation />);
      expect(containerEl.children).toHaveLength(1);
      expect(screen.getByText(/cad workspace/i)).toBeDefined();
      expect(screen.queryByText(/materials & finishes/i)).toBeNull();

      // 5. Switch to AI -> Exactly 1 child (AI)
      act(() => {
        useCanvasStore.getState().setActiveDrawer('ai');
      });
      rerender(<ContextualWorkstation />);
      expect(containerEl.children).toHaveLength(1);
      expect(screen.getByText(/ai architect co-pilot/i)).toBeDefined();
      expect(screen.queryByText(/cad workspace/i)).toBeNull();

      // 6. Close -> 0 children
      act(() => {
        useCanvasStore.getState().closeDrawer();
      });
      rerender(<ContextualWorkstation />);
      expect(containerEl.children).toHaveLength(0);
    });
  });
});
