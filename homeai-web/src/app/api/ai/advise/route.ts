import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userMessage } = body;
    
    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lower = userMessage.toLowerCase();
    
    // Fake logic for mock Phase 3 responses
    if (lower.includes('window') || lower.includes('light')) {
      return NextResponse.json({
        message: "Adding more windows on the south-facing wall can improve natural lighting significantly. Would you like me to add a large window?",
        suggestions: [
          {
            id: "sug-1",
            title: "Add South Window",
            description: "Adds a 1500mm wide window to the southern wall.",
            affectedElements: [],
            applied: false
          }
        ]
      });
    }

    if (lower.includes('wall') || lower.includes('room')) {
      return NextResponse.json({
        message: "I can help you divide this space. Here is a suggestion to add an interior partition wall.",
        suggestions: [
          {
            id: "sug-2",
            title: "Add Partition Wall",
            description: "Adds a 150mm interior partition wall.",
            affectedElements: [],
            applied: false
          }
        ]
      });
    }

    return NextResponse.json({
      message: "I can analyze your floor plan and suggest optimizations for space, lighting, and vaastu compliance. Try asking about 'adding windows' or 'dividing a room'.",
      suggestions: []
    });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
