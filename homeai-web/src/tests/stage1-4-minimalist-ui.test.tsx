/**
 * Stage 1.4 Minimalist UI & Professional Consistency Verification Test Suite
 *
 * Verifies:
 * 1. Landing page human-centric typography, copy, and CTAs.
 * 2. Project dashboard visual hierarchy and sample templates.
 * 3. 4-step Project Creation Wizard progressive disclosure and validation.
 * 4. Architectural Workstation drawer palette consistency and unified styling.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HeroSection } from '@/features/landing/components/hero-section';
import { Navbar } from '@/components/ui/navbar';
import { Footer } from '@/components/ui/footer';
import { ProjectDashboard } from '@/features/project-mgmt/components/project-dashboard';
import { CreateProjectWizard } from '@/features/project-mgmt/components/create-project-wizard';
import { FurnitureCatalogDock } from '@/features/canvas/components/furniture-catalog-dock';
import { MaterialsColorsDock } from '@/features/canvas/components/materials-colors-dock';
import { PropertiesPanel } from '@/features/canvas/components/properties-panel';
import { AIAdvisorPanel } from '@/features/ai-advisor/components/ai-advisor-panel';
import { ArchitecturalNavSidebar } from '@/features/canvas/components/architectural-nav-sidebar';
import { UserJourneyStepper } from '@/features/canvas/components/user-journey-stepper';
import { BottomFeatureStrip } from '@/features/canvas/components/bottom-feature-strip';
import { useCanvasStore } from '@/store/canvas-store';
import { useProjectStore } from '@/store/project-store';
import { createProject } from '@/core/domain/project-factory';

// Mock Next.js router & pathname
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/editor/test-project-123',
}));

describe('Stage 1.4: Minimalist UI, Beginner-Friendly UX & Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useCanvasStore.setState({
      activeDrawer: 'none',
      viewMode: '2d',
      tool: 'select',
      walkthroughActive: false,
    });
  });

  describe('1. Landing Page & Global Shell', () => {
    it('renders clean, human-centric hero headline and beginner value propositions', () => {
      render(<HeroSection />);

      // Welcoming headline
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/Architectural home design/i);
      expect(heading).toHaveTextContent(/simplified/i);

      // Clear primary CTAs
      expect(screen.getByRole('link', { name: /start designing free/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /explore sample villa/i })).toBeInTheDocument();

      // Beginner feature badges
      expect(screen.getByText(/2D CAD Plans/i)).toBeInTheDocument();
      expect(screen.getByText(/3D Walkthrough/i)).toBeInTheDocument();
      expect(screen.getByText(/^Multi-Floor$/i)).toBeInTheDocument();
      expect(screen.getByText(/NBC 2024 \/ IBC/i)).toBeInTheDocument();
    });

    it('renders clean navigation bar with approachable brand and links', () => {
      render(<Navbar />);

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(within(nav).getByRole('link', { name: /homeai designer/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /how it works/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /standards/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /sample villa/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /new project/i })).toBeInTheDocument();
    });

    it('renders clean footer without sci-fi monospace markers', () => {
      render(<Footer />);

      expect(screen.getByText(/AI-assisted home planning and architectural visualization platform/i)).toBeInTheDocument();
      expect(screen.getByText(/NBC 2024 \(India\)/i)).toBeInTheDocument();
      expect(screen.getByText(/IBC 2024 \(International\)/i)).toBeInTheDocument();
    });
  });

  describe('2. Project Dashboard Hierarchy', () => {
    it('renders clear dashboard with metrics, search, and sample villa discovery', async () => {
      render(<ProjectDashboard />);

      // Header and CTA
      expect(screen.getByText(/Architectural Workspace/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /new project/i })).toBeInTheDocument();

      // Metric strip
      expect(screen.getByText(/Total Projects/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Levels/i)).toBeInTheDocument();
      expect(screen.getByText(/Modeled Area/i)).toBeInTheDocument();
      expect(screen.getByText(/Design Standards/i)).toBeInTheDocument();

      // Search input
      expect(screen.getByPlaceholderText(/search projects by title/i)).toBeInTheDocument();
    });
  });

  describe('3. Project Creation Wizard Progressive Disclosure', () => {
    it('guides users through 4 clear steps with plain English explanations', async () => {
      render(<CreateProjectWizard initialMode="manual_cad" />);

      // Step 1: House Type & Levels
      expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
      expect(screen.getByText(/House Type & Levels/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. House Type/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Plot & Setbacks/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Rooms & Spaces/i)).toBeInTheDocument();
      expect(screen.getByText(/4\. Style & Standards/i)).toBeInTheDocument();

      // Validation on empty title
      const continueBtn = screen.getByRole('button', { name: /continue to step 2/i });
      fireEvent.click(continueBtn);
      expect(screen.getByText(/please enter a project title/i)).toBeInTheDocument();

      // Enter project name
      const titleInput = screen.getByPlaceholderText(/e\.g\. Maple Creek Villa/i);
      fireEvent.change(titleInput, { target: { value: 'My Minimalist Villa' } });

      // Advance to Step 2: Plot & Setbacks
      fireEvent.click(continueBtn);
      expect(screen.getByText(/Step 2 of 4/i)).toBeInTheDocument();
      expect(screen.getByText(/Plot Size & Boundary Margins/i)).toBeInTheDocument();
      expect(screen.getByText(/Road Facing Direction/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Required Setback Margins/i)[0]).toBeInTheDocument();

      // Advance to Step 3: Rooms & Spaces
      const step2Next = screen.getByRole('button', { name: /continue to step 3/i });
      fireEvent.click(step2Next);
      expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
      expect(screen.getByText(/Rooms & Dedicated Spaces/i)).toBeInTheDocument();
      expect(screen.getByText(/Bedrooms Configuration/i)).toBeInTheDocument();
      expect(screen.getByText(/Specialized Living Spaces/i)).toBeInTheDocument();

      // Advance to Step 4: Style & Standards
      const step3Next = screen.getByRole('button', { name: /continue to step 4/i });
      fireEvent.click(step3Next);
      expect(screen.getByText(/Step 4 of 4/i)).toBeInTheDocument();
      expect(screen.getByText(/Design Style & Standards/i)).toBeInTheDocument();
      expect(screen.getByText(/Architectural Style/i)).toBeInTheDocument();
      expect(screen.getByText(/Building Code Standards/i)).toBeInTheDocument();

      // Final CTA
      expect(screen.getByRole('button', { name: /create project & open editor/i })).toBeInTheDocument();

      // Back navigation
      const backBtn = screen.getByRole('button', { name: /^back$/i });
      fireEvent.click(backBtn);
      expect(screen.getByText(/Step 3 of 4/i)).toBeInTheDocument();
    });
  });

  describe('4. Contextual Drawers Unified Light/Slate Surfaces', () => {
    beforeEach(() => {
      const mockProj = createProject({
        name: 'Harmonized Studio Villa',
        plotWidthMm: 15000,
        plotDepthMm: 12000,
        preferredUnit: 'm',
        unitSystem: 'metric',
        style: 'modern',
        floorsCount: 2,
        priorities: ['natural light'],
      });
      useProjectStore.setState({
        currentProject: mockProj,
      });
    });

    it('renders FurnitureCatalogDock in harmonized white/slate surface matching CAD workspace', () => {
      useCanvasStore.setState({ activeDrawer: 'catalog' });
      const { container } = render(<FurnitureCatalogDock />);

      expect(screen.getByText(/furniture & decor/i)).toBeInTheDocument();
      expect(screen.getByTitle(/close catalog/i)).toBeInTheDocument();

      // Check root container surface styling
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('bg-white');
      expect(root).toHaveClass('border-slate-200');
    });

    it('renders MaterialsColorsDock in harmonized white/slate surface matching CAD workspace', () => {
      useCanvasStore.setState({ activeDrawer: 'materials' });
      const { container } = render(<MaterialsColorsDock />);

      expect(screen.getByText(/materials & finishes/i)).toBeInTheDocument();
      expect(screen.getByTitle(/close materials dock/i)).toBeInTheDocument();

      // Check root container surface styling
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('bg-white');
      expect(root).toHaveClass('border-slate-200');
    });

    it('renders PropertiesPanel in consistent white/slate surface', () => {
      useCanvasStore.setState({ activeDrawer: 'properties' });
      const { container } = render(<PropertiesPanel />);

      expect(screen.getByText(/cad workspace/i)).toBeInTheDocument();
      expect(screen.getByTitle(/collapse left sidebar/i)).toBeInTheDocument();

      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('bg-white');
    });

    it('renders AIAdvisorPanel in consistent white/slate surface', () => {
      useCanvasStore.setState({ activeDrawer: 'ai' });
      const { container } = render(<AIAdvisorPanel />);

      expect(screen.getByText(/ai architect co-pilot/i)).toBeInTheDocument();

      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass('bg-white');
    });
  });

  describe('5. Architectural Shell Nav & Feature Strips', () => {
    it('renders ArchitecturalNavSidebar with cohesive slate styling and accessible controls', () => {
      render(<ArchitecturalNavSidebar />);

      expect(screen.getByText(/HomeAI Designer/i)).toBeInTheDocument();
      expect(screen.getByText(/Architectural Studio/i)).toBeInTheDocument();

      // Test drawer launcher buttons
      expect(screen.getByRole('button', { name: /furniture & decor/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /materials & finishes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /properties & tools/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ai chat/i })).toBeInTheDocument();

      // Test sidebar collapse toggle
      const collapseBtn = screen.getByTitle(/collapse sidebar/i);
      fireEvent.click(collapseBtn);
      expect(screen.getByTitle(/expand sidebar/i)).toBeInTheDocument();
    });

    it('renders UserJourneyStepper with sleek controls and all 7 stages', () => {
      render(<UserJourneyStepper />);

      expect(screen.getByText(/Start & Requirements/i)).toBeInTheDocument();
      expect(screen.getByText(/2D Floor Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Confirm & Edit/i)).toBeInTheDocument();
      expect(screen.getByText(/3D Generation/i)).toBeInTheDocument();
      expect(screen.getByText(/Customize Everything/i)).toBeInTheDocument();
      expect(screen.getByText(/Walkthrough/i)).toBeInTheDocument();
      expect(screen.getByText(/Save, Render & Export/i)).toBeInTheDocument();
    });

    it('renders BottomFeatureStrip with Live Sync, 2D/3D toggles and export action', () => {
      const onExport = vi.fn();
      render(<BottomFeatureStrip onOpenExportModal={onExport} />);

      expect(screen.getByRole('contentinfo', { name: /project sync and navigation bar/i })).toBeInTheDocument();
      expect(screen.getByText(/2D & 3D Sync/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^2D$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^3D$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });
  });
});
