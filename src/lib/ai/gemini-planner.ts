import "server-only";
import { GoogleGenAI } from "@google/genai";
import type {
  AIPlanner,
  EffortEstimate,
  RescueAdvice,
  TaskChatResponse,
  TaskBreakdown,
} from "@/lib/ai/ai-planner";
import type { AvailabilityWindow, Task } from "@/lib/planner/planner";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function extractJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateJson<T>(prompt: string, fallback: T): Promise<T> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await getClient().models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      return extractJson(response.text ?? "", fallback);
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const is503Error = error instanceof Error &&
        (error.message.includes("503") ||
         error.message.includes("UNAVAILABLE") ||
         error.message.includes("high demand"));

      // If it's a 503 and not the last attempt, retry with exponential backoff
      if (is503Error && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.log(`Gemini API busy (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Last attempt or non-503 error: return fallback
      console.error("Gemini API error:", error);
      return fallback;
    }
  }

  return fallback;
}

export class GeminiPlanner implements AIPlanner {
  async estimateEffort(taskDescription: string): Promise<EffortEstimate> {
    return generateJson<EffortEstimate>(
      `Estimate the effort for this task. Return only JSON with keys estimatedEffortHours, confidence, reasoning.

Task:
${taskDescription}`,
      {
        estimatedEffortHours: 4,
        confidence: "low",
        reasoning: "Fallback estimate used because Gemini was unavailable.",
      },
    );
  }

  async breakDownTask(params: {
    title: string;
    description: string;
    estimatedEffortHours: number;
  }): Promise<TaskBreakdown> {
    return generateJson<TaskBreakdown>(
      `Break this task into ordered, actionable subtasks. Return only JSON with key subtasks, where each subtask has title, estimatedHours, order.

Title: ${params.title}
Description: ${params.description}
Estimated effort hours: ${params.estimatedEffortHours}`,
      {
        subtasks: [
          {
            title: `Start ${params.title}`,
            estimatedHours: Math.max(1, params.estimatedEffortHours),
            order: 1,
          },
        ],
      },
    );
  }

  async generateRescueAdvice(params: {
    task: Task;
    availability: AvailabilityWindow[];
    risk: string;
  }): Promise<RescueAdvice> {
    return generateJson<RescueAdvice>(
      `You are Deadline Rescue AI, an agentic productivity planner.
Create concise rescue advice for this task. Return only JSON with keys:
summary, nextBestAction, scopeReductionIdeas, productivityTips.

Task title: ${params.task.title}
Deadline: ${params.task.dueDate}
Estimated effort hours: ${params.task.estimatedEffortHours}
Priority: ${params.task.priority}
Risk: ${params.risk}
Availability windows JSON: ${JSON.stringify(params.availability)}`,
      {
        summary: "AI advice unavailable. A deterministic rescue plan was generated.",
        nextBestAction: "Start with the earliest recommended focus block.",
        scopeReductionIdeas: [
          "Prioritize the smallest complete version of the task.",
          "Defer optional polish until core work is complete.",
        ],
        productivityTips: [
          "Work in focused blocks and update effort after each block.",
        ],
      },
    );
  }

  async answerTaskQuestion(params: {
    question: string;
    task: Task;
    plan: {
      risk: string;
      riskReason: string;
      focusBlocks: {
        title: string;
        start: string;
        end: string;
        durationHours: number;
      }[];
    };
    advice?: RescueAdvice | null;
  }): Promise<TaskChatResponse> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await getClient().models.generateContent({
          model: MODEL,
          contents: `You are Deadline Rescue AI, a focused task rescue coach.
Answer the user's question using only the task, rescue plan, focus blocks, and advice context below.
Be practical, specific, and concise. If the user asks for a schedule, reference the focus blocks.

Task:
${JSON.stringify(params.task)}

Rescue plan:
${JSON.stringify(params.plan)}

Existing Gemini advice:
${JSON.stringify(params.advice)}

User question:
${params.question}`,
        });

        return {
          answer: response.text ?? "I could not generate an answer right now.",
        };
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const is503Error = error instanceof Error &&
          (error.message.includes("503") ||
           error.message.includes("UNAVAILABLE") ||
           error.message.includes("high demand"));

        if (is503Error && !isLastAttempt) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(`Gemini API busy (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        // Last attempt or non-503 error
        if (is503Error) {
          throw new Error("Gemini is experiencing high demand right now. Please try again in a few moments.");
        }
        throw error;
      }
    }

    return {
      answer: "I could not generate an answer right now.",
    };
  }
}
