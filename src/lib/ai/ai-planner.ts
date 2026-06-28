import type { AvailabilityWindow, Task } from "@/lib/planner/planner";

export type EffortEstimate = {
    estimatedEffortHours: number;
    confidence: "low" | "medium" | "high";
    reasoning: string;
};

export type TaskBreakdown = {
    subtasks: {
        title: string;
        estimatedHours: number;
        order: number;
    }[];
};

export type RescueAdvice = {
    summary: string;
    nextBestAction: string;
    scopeReductionIdeas: string[];
    productivityTips: string[];
    taskBreakdown?: TaskBreakdown;
    effortEstimate?: EffortEstimate;
};

export type TaskChatResponse = {
    answer: string;
};

export interface AIPlanner {
    estimateEffort(taskDescription: string): Promise<EffortEstimate>;
    breakDownTask(params: {
        title: string;
        description: string;
        estimatedEffortHours: number;
    }): Promise<TaskBreakdown>;
    generateRescueAdvice(params: {
        task: Task;
        availability: AvailabilityWindow[];
        risk: string;
    }): Promise<RescueAdvice>;
    answerTaskQuestion(params: {
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
    }): Promise<TaskChatResponse>;
}
