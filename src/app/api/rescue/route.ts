import { RescueAgent } from "@/lib/agent/rescue-agent";
import { GeminiPlanner } from "@/lib/ai/gemini-planner";
import { getAuthenticatedUserId } from "@/lib/auth/session";
import { GoogleCalendarProvider } from "@/lib/calendar/providers/google-calendar-provider";
import { FirebaseAdminTaskRepository } from "@/lib/db/firebase-admin-task-repository";
import type { StoredTask } from "@/lib/db/task-repository";
import type { RescueAdvice } from "@/lib/ai/ai-planner";
import type { RescuePlan, Task } from "@/lib/planner/planner";

type RescueRequest = {
  mode?: "generate";
  title: string;
  dueDate: string;
  estimatedEffortHours: number;
  priority: StoredTask["priority"];
};

type RescueChatRequest = {
  mode: "chat";
  question: string;
  task: Task;
  plan: RescuePlan;
  advice?: RescueAdvice | null;
};

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    const body = (await request.json()) as RescueRequest | RescueChatRequest;

    if (body.mode === "chat") {
      if (!body.question.trim()) {
        return Response.json({ error: "Question is required." }, { status: 400 });
      }

      const answer = await new GeminiPlanner().answerTaskQuestion({
        question: body.question,
        task: body.task,
        plan: body.plan,
        advice: body.advice,
      });

      return Response.json(answer);
    }

    const taskRepository = new FirebaseAdminTaskRepository();
    const calendarProvider = new GoogleCalendarProvider();

    if (!(await calendarProvider.isConnected(userId))) {
      return Response.json(
        {
          error: "Google Calendar must be connected again before generating a rescue plan.",
        },
        { status: 409 },
      );
    }

    const nowIso = new Date().toISOString();
    const taskToCreate: Omit<StoredTask, "id"> = {
      userId,
      title: body.title,
      dueDate: body.dueDate,
      estimatedEffortHours: body.estimatedEffortHours,
      priority: body.priority,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: "scheduled",
    };

    const savedTask = await taskRepository.createTask(taskToCreate);
    const rescueAgent = new RescueAgent(
      taskRepository,
      calendarProvider,
      new GeminiPlanner(),
    );
    const result = await rescueAgent.rescueTask({
      userId,
      task: savedTask,
    });

    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate rescue plan.";

    return Response.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
