import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { FirebaseAdminTaskRepository } from "@/lib/db/firebase-admin-task-repository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = (await request.json()) as { status?: string };

    const taskRepository = new FirebaseAdminTaskRepository();
    const tasks = await taskRepository.listTasks(user.id);
    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (body.status) {
      task.status = body.status as any;
      task.updatedAt = new Date().toISOString();
    }

    const updatedTask = await taskRepository.updateTask(task);

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("Failed to update task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await taskRepository.deleteTask(user.id, taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
