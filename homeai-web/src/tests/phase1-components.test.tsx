import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// =====================================================
// PHASE 1 — UI Primitive Component Tests
// =====================================================

describe("Badge", () => {
  it("renders children correctly", () => {
    render(<Badge>AI-Powered</Badge>);
    expect(screen.getByText("AI-Powered")).toBeDefined();
  });

  it("applies default variant classes", () => {
    const { container } = render(<Badge>Test</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-indigo-100");
  });

  it("applies warning variant classes", () => {
    const { container } = render(<Badge variant="warning">Caution</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-amber-100");
  });

  it("applies success variant classes", () => {
    const { container } = render(<Badge variant="success">Done</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("bg-emerald-100");
  });
});

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeDefined();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(clicked).toBe(true);
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByText("Loading…")).toBeDefined();
  });

  it("applies primary variant classes by default", () => {
    const { container } = render(<Button>Test</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("bg-indigo-600");
  });

  it("applies outline variant classes", () => {
    const { container } = render(<Button variant="outline">Test</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain("border-slate-300");
  });
});

describe("Card", () => {
  it("renders children inside a Card", () => {
    render(
      <Card>
        <CardContent>Card body content</CardContent>
      </Card>
    );
    expect(screen.getByText("Card body content")).toBeDefined();
  });

  it("applies hover classes when hover prop is true", () => {
    const { container } = render(<Card hover>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("cursor-pointer");
  });
});
