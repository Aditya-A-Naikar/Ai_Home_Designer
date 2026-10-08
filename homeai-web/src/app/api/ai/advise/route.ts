import { NextResponse } from 'next/server';
import { generatePlanFromPrompt } from '@/core/ai/plan-generator';
import { Project } from '@/core/domain/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userMessage, projectContext } = body;
    
    if (!projectContext) {
      return NextResponse.json({
        message: "No project floor plan was provided for analysis. Please open or create a project first.",
        actions: [],
        suggestions: []
      });
    }

    const project = projectContext as Project;
    const generationResult = generatePlanFromPrompt(userMessage || "audit", project);

    return NextResponse.json({
      message: generationResult.message,
      actions: generationResult.actions,
      suggestions: generationResult.suggestions,
      replaceFloor: generationResult.replaceFloor,
      placementSummary: generationResult.placementSummary,
    });

  } catch (error) {
    console.error("AI Advisor API Error:", error);
    return NextResponse.json({ 
      error: 'Failed to process architectural request',
      message: "An error occurred while evaluating architectural rules. Please check project boundaries."
    }, { status: 500 });
  }
}
