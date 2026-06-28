import "server-only";
import type { RescuePlan } from "@/lib/planner/planner";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/db/firebase-admin";
import type {
  SaveRescuePlanInput,
  StoredTask,
  TaskRepository,
} from "@/lib/db/task-repository";

function getTasksCollection(userId: string) {
  return adminDb.collection("users").doc(userId).collection("tasks");
}

export class FirebaseAdminTaskRepository implements TaskRepository {
  async createTask(task: Omit<StoredTask, "id">): Promise<StoredTask> {
    const docRef = await getTasksCollection(task.userId).add(task);

    return {
      ...task,
      id: docRef.id,
    };
  }

  async listTasks(userId: string): Promise<StoredTask[]> {
    const snapshot = await getTasksCollection(userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data() as Omit<StoredTask, "id">;

      return {
        ...data,
        id: doc.id,
      };
    });
  }

  async updateTask(task: StoredTask): Promise<StoredTask> {
    const { id, ...taskData } = task;
    await getTasksCollection(task.userId).doc(id).set(taskData, { merge: true });
    return task;
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    await getTasksCollection(userId).doc(taskId).delete();
  }

  async saveRescuePlan(input: SaveRescuePlanInput): Promise<void> {
    await getTasksCollection(input.userId)
      .doc(input.taskId)
      .collection("plans")
      .add({
        ...input.plan,
        createdAt: FieldValue.serverTimestamp(),
      });
  }

  async getLatestRescuePlan(
    userId: string,
    taskId: string
  ): Promise<RescuePlan | null> {
    const snapshot = await getTasksCollection(userId)
      .doc(taskId)
      .collection("plans")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const plan = snapshot.docs[0].data();
    delete plan.createdAt;
    return plan as RescuePlan;
  }
}
