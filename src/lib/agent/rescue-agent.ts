import type { AIPlanner, RescueAdvice } from "@/lib/ai/ai-planner";
import type { CalendarProvider } from "@/lib/calendar/providers/calendar-provider";
import type { TaskRepository, StoredTask } from "@/lib/db/task-repository";
import { generateRescuePlan, type RescuePlan } from "@/lib/planner/planner";

export type RescueAgentResult = {
    task: StoredTask;
    plan: RescuePlan;
    advice: RescueAdvice;
};

export class RescueAgent {
    constructor(
        private readonly taskRepository: TaskRepository,
        private readonly calendarProvider: CalendarProvider,
        private readonly aiPlanner: AIPlanner
    ) {}

    async rescueTask(params: {
        userId: string;
        task: StoredTask;
        now?: Date;
    }): Promise<RescueAgentResult> {

        const now = params.now ?? new Date();

        // Get busy calendar events
        const busyEvents = await this.calendarProvider.listBusyEvents({
            userId: params.userId,
            from: now.toISOString(),
            to: params.task.dueDate,
        });

        // Get AI task breakdown FIRST to inform focus block generation
        let taskBreakdown;
        try {
            taskBreakdown = await this.aiPlanner.breakDownTask({
                title: params.task.title,
                description: params.task.title,
                estimatedEffortHours: params.task.estimatedEffortHours,
            });
        } catch {
            taskBreakdown = undefined;
        }

        // Generate plan WITH subtasks for intelligent block sizing
        const plan = generateRescuePlan(
            params.task,
            busyEvents,
            now,
            taskBreakdown?.subtasks
        );

        // Get remaining AI advice in parallel
        const advice = await this.createAdvice(params.task, plan, taskBreakdown);

        await this.taskRepository.saveRescuePlan({
            userId: params.userId,
            taskId: params.task.id,
            plan,
        });

        return {
            task: params.task,
            plan,
            advice,
        };
    }

    private async createAdvice(
        task: StoredTask,
        plan: RescuePlan,
        taskBreakdown?: { subtasks: Array<{ title: string; estimatedHours: number; order: number }> }
    ) {
        try {
            const [effortEstimate, advice] = await Promise.all([
                this.aiPlanner.estimateEffort(
                    `${task.title}. Deadline: ${task.dueDate}. Priority: ${task.priority}.`,
                ),
                this.aiPlanner.generateRescueAdvice({
                    task,
                    availability: plan.freeWindows,
                    risk: plan.risk,
                }),
            ]);

            return {
                ...advice,
                effortEstimate,
                taskBreakdown,
            };
        } catch {
            return {
                summary: "AI advice unavailable. A deterministic rescue plan was generated.",
                nextBestAction: "Start with the first recommended focus block.",
                scopeReductionIdeas: [
                    "Reduce the task to the smallest useful version.",
                    "Defer optional work until the core deadline is safe.",
                ],
                productivityTips: [
                    "Use the focus blocks as appointments and update effort after each one.",
                ],
            };
        }
    }
}
