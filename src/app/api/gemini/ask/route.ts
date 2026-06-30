import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as {
      question: string;
      context: {
        taskTitle: string;
        dueDate: string;
        estimatedEffortHours: number;
        priority: string;
        status: string;
        plan?: any;
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenAI({ apiKey });

    const promptText = `You are a productivity assistant helping with task management and deadline planning.

Task Context:
- Title: ${body.context.taskTitle}
- Due Date: ${new Date(body.context.dueDate).toLocaleString()}
- Estimated Effort: ${body.context.estimatedEffortHours} hours
- Priority: ${body.context.priority}
- Status: ${body.context.status}
${body.context.plan ? `- Has Rescue Plan: Yes (${body.context.plan.focusBlocks?.length || 0} focus blocks)` : '- Has Rescue Plan: No'}

User Question: ${body.question}

Provide a helpful, actionable response. Be concise but thorough. If the user asks about breaking down the task, provide specific subtasks. If they ask about approaches, give 2-3 concrete strategies. Focus on practical advice.`;

    const result = await genAI.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
      contents: promptText,
    });

    const answer = result.text ?? "No response from AI";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Gemini ask error:", error);

    // Check for 503 errors
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
      return NextResponse.json(
        { error: "AI service is experiencing high demand. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get response from Gemini AI" },
      { status: 500 }
    );
  }
}
