import type { Task, RescuePlan } from "@/lib/planner/planner";

export type StoredTask = Task & {
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: "todo" | "scheduled" | "in-progress" | "blocked" | "done" | "cancelled";
};

export type SaveRescuePlanInput = {
  userId: string;
  taskId: string;
  plan: RescuePlan;
};

export interface TaskRepository {
  createTask(task: Omit<StoredTask, "id">): Promise<StoredTask>;
  listTasks(userId: string): Promise<StoredTask[]>;
  updateTask(task: StoredTask): Promise<StoredTask>;
  deleteTask(userId: string, taskId: string): Promise<void>;
  saveRescuePlan(input: SaveRescuePlanInput): Promise<void>;
  getLatestRescuePlan(userId: string, taskId: string): Promise<RescuePlan | null>;
}
