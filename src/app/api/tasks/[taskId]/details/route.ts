import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { FirebaseAdminTaskRepository } from "@/lib/db/firebase-admin-task-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const taskRepository = new FirebaseAdminTaskRepository();

    // Get task details
    const tasks = await taskRepository.listTasks(user.id);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get rescue plan if exists
    const plan = await taskRepository.getLatestRescuePlan(user.id, taskId);

    // Get AI advice if stored (we'll need to fetch from Firestore directly)
    // For now, return task and plan
    return NextResponse.json({
      task,
      plan,
    });
  } catch (error) {
    console.error("Failed to get task details:", error);
    return NextResponse.json(
      { error: "Failed to get task details" },
      { status: 500 }
    );
  }
}
