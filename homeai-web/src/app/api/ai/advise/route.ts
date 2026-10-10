import { NextResponse } from 'next/server';
import { generatePlanFromPrompt } from '@/core/ai/plan-generator';
import { orchestrateDesignAction } from '@/core/ai/action-orchestrator';
import { Project } from '@/core/domain/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userMessage, projectContext, selectedEntity } = body;
    
    if (!projectContext) {
      return NextResponse.json({
        message: "No project floor plan was provided for analysis. Please open or create a project first.",
        actions: [],
        suggestions: []
      });
    }

    const project = projectContext as Project;
    const generationResult = generatePlanFromPrompt(userMessage || "audit", project, undefined, selectedEntity);

    // Check if prompt describes a multi-option design modification request
    const pLower = (userMessage || "").toLowerCase();
    const isMicroEdit = 
      (pLower.includes("sofa") || pLower.includes("couch") || pLower.includes("carpet") || pLower.includes("rug") || pLower.includes("move") || pLower.includes("window") || pLower.includes("closer")) &&
      !pLower.includes("2bhk") && !pLower.includes("1bhk") && !pLower.includes("duplex");

    const proposal = isMicroEdit 
      ? orchestrateDesignAction(userMessage, project, selectedEntity) 
      : null;

    return NextResponse.json({
      message: generationResult.message,
      actions: generationResult.actions,
      suggestions: generationResult.suggestions,
      replaceFloor: generationResult.replaceFloor,
      placementSummary: generationResult.placementSummary,
      proposal,
    });

  } catch (error) {
    console.error("AI Advisor API Error:", error);
    return NextResponse.json({ 
      error: 'Failed to process architectural request',
      message: "An error occurred while evaluating architectural rules. Please check project boundaries."
    }, { status: 500 });
  }
}
