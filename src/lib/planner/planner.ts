
export type Priority = "low" | "medium" | "high" | "highest";

export type Task = {
    id: string;
    title: string;
    dueDate: string;    // ISO date string
    estimatedEffortHours: number;
    priority: Priority;
};

export type CalendarEvent = {
    id: string;
    title: string;
    start: string;  // ISO date string
    end: string;    // ISO date string
    isBusy: boolean;
};

export type AvailabilityWindow = {
    start: string;
    end: string;
    durationHours: number;
};

export type FocusBlock = {
    title: string;
    start: string;
    end: string;
    durationHours: number;
    description?: string;
};

export type SubTask = {
    title: string;
    estimatedHours: number;
    order: number;
};

export type RescuePlan = {
    risk: "on-track" | "tight" | "at-risk";
    riskReason: string;
    priorityScore: number;
    requiredHours: number;
    availableHours: number;
    remainingUnscheduledHours: number;
    freeWindows: AvailabilityWindow[];
    focusBlocks: FocusBlock[];
};

function hoursBetween(start: Date, end: Date): number {
    const milliseconds = end.getTime() - start.getTime();
    const hours = milliseconds / (1000 * 60 * 60);

    return Math.max(0, hours);
}

function getPriorityWeight(priority: Priority): number {
    if (priority === "highest") {
        return 40;
    }

    if (priority === "high") {
        return 30;
    }

    if (priority === "medium") {
        return 20;
    }

    return 10;
}

function calculatePriorityScore(task: Task, availableHours: number, now: Date): number {
    const deadline = new Date(task.dueDate);
    const hoursUntilDeadline = Math.max(1, hoursBetween(now, deadline));

    const urgencyScore = Math.min(40, 72 / hoursUntilDeadline * 10);
    const effortPressureScore = Math.min(30, task.estimatedEffortHours / Math.max(1, availableHours) * 10);
    const priorityWeight = getPriorityWeight(task.priority)

    return Math.round(urgencyScore + effortPressureScore + priorityWeight);
}

function determineOptimalBlockSize(
    remainingHours: number,
    windowHours: number,
    taskComplexity: number
): number {
    // Research-backed optimal focus block durations
    const MIN_BLOCK = 0.5; // 30 minutes minimum
    const IDEAL_SHORT = 1.5; // 90 minutes (ultradian rhythm)
    const IDEAL_LONG = 2.5; // 2.5 hours for deep work
    const MAX_BLOCK = 4; // 4 hours maximum before fatigue

    // For small remaining work (< 1 hour), use smaller blocks
    if (remainingHours < 1) {
        return Math.max(MIN_BLOCK, Math.min(remainingHours, windowHours));
    }

    // High complexity tasks benefit from longer, uninterrupted focus
    // Low complexity can use shorter bursts
    const preferredDuration = taskComplexity > 7 ? IDEAL_LONG : IDEAL_SHORT;

    // Try to fit the preferred duration
    const candidateSize = Math.min(remainingHours, windowHours, preferredDuration);

    // If we have a lot of time left, consider using longer blocks
    if (remainingHours > 4 && windowHours > 3) {
        return Math.min(remainingHours, windowHours, MAX_BLOCK);
    }

    return Math.max(MIN_BLOCK, candidateSize);
}

export function generateRescuePlan(
    task: Task,
    calendarEvents: CalendarEvent[],
    now: Date = new Date(),
    subtasks?: SubTask[]
): RescuePlan {

    const deadline = new Date(task.dueDate);

    const busyEvents = calendarEvents.filter((event) => event.isBusy).map((event) => ({
        ...event,
        startDate: new Date(event.start),
        endDate: new Date(event.end),
    }))
    .filter((event) => event.endDate > now && event.startDate < deadline)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const freeWindows: AvailabilityWindow[] = [];

    let cursor = now;

    for (const event of busyEvents) {
        if (event.startDate > cursor) {
            freeWindows.push({
                start: cursor.toISOString(),
                end: event.startDate.toISOString(),
                durationHours: hoursBetween(cursor, event.startDate),
            });
        }

        if (event.endDate > cursor) {
            cursor = event.endDate;
        }
    }

    if (cursor < deadline) {
        freeWindows.push({
            start: cursor.toISOString(),
            end: deadline.toISOString(),
            durationHours: hoursBetween(cursor, deadline),
        });
    }

    const availableHours = freeWindows.reduce((total, window) => {
        return total + window.durationHours;
    }, 0);

    let risk: RescuePlan["risk"];

    if (availableHours >= task.estimatedEffortHours * 1.5) {
        risk = "on-track";
    } else if (availableHours >= task.estimatedEffortHours) {
        risk = "tight";
    } else {
        risk = "at-risk";
    }

    let riskReason: string;
    if (risk === "on-track") {
        riskReason = "You have comfortable free time before the deadline.";
    } else if (risk === "tight") {
        riskReason = "You have enough time, but there is limited buffer.";
    } else {
        riskReason = "You do not have enough free calendar time before the deadline.";
    }

    const focusBlocks: FocusBlock[] = [];

    // Estimate task complexity (1-10 scale)
    const taskComplexity = Math.min(10, Math.ceil(task.estimatedEffortHours / 2) + (task.priority === "highest" ? 2 : 0));

    // If we have subtasks from Gemini, use intelligent scheduling
    if (subtasks && subtasks.length > 0) {
        // Sort subtasks by order
        const sortedSubtasks = [...subtasks].sort((a, b) => a.order - b.order);

        let subtaskIndex = 0;
        let remainingSubtaskHours = sortedSubtasks[0].estimatedHours;

        for (const window of freeWindows) {
            if (subtaskIndex >= sortedSubtasks.length) {
                break;
            }

            let blockCursor = new Date(window.start);
            const windowEnd = new Date(window.end);

            while (subtaskIndex < sortedSubtasks.length && blockCursor < windowEnd) {
                const currentSubtask = sortedSubtasks[subtaskIndex];
                const hoursLeftInWindow = hoursBetween(blockCursor, windowEnd);

                if (hoursLeftInWindow < 0.5) {
                    break; // Window too small
                }

                // Determine optimal block size for this subtask
                const blockHours = determineOptimalBlockSize(
                    remainingSubtaskHours,
                    hoursLeftInWindow,
                    taskComplexity
                );

                const blockStart = blockCursor;
                const blockEnd = new Date(blockStart.getTime() + blockHours * 60 * 60 * 1000);

                focusBlocks.push({
                    title: currentSubtask.title,
                    start: blockStart.toISOString(),
                    end: blockEnd.toISOString(),
                    durationHours: blockHours,
                    description: `Step ${currentSubtask.order} of ${sortedSubtasks.length}`,
                });

                remainingSubtaskHours -= blockHours;
                blockCursor = blockEnd;

                // Move to next subtask if current one is complete
                if (remainingSubtaskHours <= 0.1) {
                    subtaskIndex++;
                    if (subtaskIndex < sortedSubtasks.length) {
                        remainingSubtaskHours = sortedSubtasks[subtaskIndex].estimatedHours;
                    }
                }
            }
        }
    } else {
        // Fallback: no subtasks, use intelligent block sizing
        let remainingHours = task.estimatedEffortHours;

        for (const window of freeWindows) {
            if (remainingHours <= 0) {
                break;
            }

            let blockCursor = new Date(window.start);
            const windowEnd = new Date(window.end);

            while (remainingHours > 0 && blockCursor < windowEnd) {
                const hoursLeftInWindow = hoursBetween(blockCursor, windowEnd);

                if (hoursLeftInWindow < 0.5) {
                    break; // Window too small
                }

                const blockHours = determineOptimalBlockSize(
                    remainingHours,
                    hoursLeftInWindow,
                    taskComplexity
                );

                const blockStart = blockCursor;
                const blockEnd = new Date(blockStart.getTime() + blockHours * 60 * 60 * 1000);

                focusBlocks.push({
                    title: task.title,
                    start: blockStart.toISOString(),
                    end: blockEnd.toISOString(),
                    durationHours: blockHours,
                });

                remainingHours -= blockHours;
                blockCursor = blockEnd;
            }
        }
    }

    const totalScheduled = focusBlocks.reduce((sum, block) => sum + block.durationHours, 0);
    const remainingUnscheduledHours = Math.max(0, task.estimatedEffortHours - totalScheduled);

    const priorityScore = calculatePriorityScore(task, availableHours, now);

    return {
        risk,
        riskReason,
        priorityScore,
        requiredHours: task.estimatedEffortHours,
        availableHours,
        remainingUnscheduledHours,
        freeWindows,
        focusBlocks,
    };
}
