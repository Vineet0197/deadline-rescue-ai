"use client";

import { useState } from "react";
import type { StoredTask } from "@/lib/db/task-repository";
import type { RescuePlan, FocusBlock } from "@/types/task";
import type { RescueAdvice } from "@/lib/ai/ai-planner";
import { RescuePlanResult } from "./RescuePlanResult";

type TaskDetailViewProps = {
  task: StoredTask;
  plan: RescuePlan | null;
  advice: RescueAdvice | null;
  onClose: () => void;
  onAddFocusBlocks: (blocks: FocusBlock[]) => void;
  onExportToAtlassian: () => void;
  isAtlassianConnected: boolean;
  isWritingFocusBlocks: boolean;
};

export function TaskDetailView({
  task,
  plan,
  advice,
  onClose,
  onAddFocusBlocks,
  onExportToAtlassian,
  isAtlassianConnected,
  isWritingFocusBlocks,
}: TaskDetailViewProps) {
  const [question, setQuestion] = useState("");
  const [isAskingGemini, setIsAskingGemini] = useState(false);
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isOverdue = hoursUntilDue < 0;
  const isCritical = hoursUntilDue < 24 || hoursUntilDue < task.estimatedEffortHours * 1.5;

  const statusColors: Record<string, string> = {
    "not-started": "bg-slate-100 text-slate-700",
    todo: "bg-slate-100 text-slate-700",
    scheduled: "bg-blue-100 text-blue-700",
    "in-progress": "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    blocked: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
  };

  const priorityColors: Record<string, string> = {
    highest: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  async function handleAskGemini() {
    if (!question.trim()) {
      setErrorMessage("Please enter a question");
      return;
    }

    setIsAskingGemini(true);
    setErrorMessage(null);
    setGeminiResponse(null);

    try {
      const response = await fetch("/api/gemini/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: {
            taskTitle: task.title,
            dueDate: task.dueDate,
            estimatedEffortHours: task.estimatedEffortHours,
            priority: task.priority,
            status: task.status,
            plan: plan || undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Gemini");
      }

      const data = await response.json() as { answer: string };
      setGeminiResponse(data.answer);
      setQuestion("");
    } catch (error) {
      console.error("Ask Gemini error:", error);
      setErrorMessage("Failed to get response from Gemini AI");
    } finally {
      setIsAskingGemini(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{task.title}</h2>
              {isOverdue && (
                <span className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                  OVERDUE
                </span>
              )}
              {!isOverdue && isCritical && (
                <span className="rounded-lg bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                  URGENT
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${statusColors[task.status]}`}>
                {task.status.replace("-", " ").toUpperCase()}
              </span>
              <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${priorityColors[task.priority]}`}>
                {task.priority.toUpperCase()} PRIORITY
              </span>
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {task.estimatedEffortHours}h EFFORT
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-slate-100"
            type="button"
          >
            <svg className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Task Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-600">Due Date</p>
                <p className="mt-1 text-slate-900">
                  {dueDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
                <p className="text-sm text-slate-600">
                  at {dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Time Remaining</p>
                <p className="mt-1 text-slate-900">
                  {isOverdue ? (
                    <span className="font-semibold text-red-700">
                      {Math.abs(Math.floor(hoursUntilDue))}h overdue
                    </span>
                  ) : (
                    <span>
                      {Math.floor(hoursUntilDue / 24)}d {Math.floor(hoursUntilDue % 24)}h
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Created</p>
                <p className="mt-1 text-sm text-slate-700">
                  {new Date(task.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Last Updated</p>
                <p className="mt-1 text-sm text-slate-700">
                  {new Date(task.updatedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Rescue Plan */}
          {plan && (
            <div>
              <h3 className="mb-3 text-lg font-bold text-slate-900">Rescue Plan</h3>
              <RescuePlanResult
                advice={advice}
                isWritingFocusBlocks={isWritingFocusBlocks}
                onAddFocusBlocks={() => onAddFocusBlocks(plan.focusBlocks)}
                plan={plan}
                task={task}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {plan && (
              <button
                onClick={() => onAddFocusBlocks(plan.focusBlocks)}
                disabled={isWritingFocusBlocks}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {isWritingFocusBlocks ? "Adding to Calendar..." : "Add to Calendar"}
              </button>
            )}

            {isAtlassianConnected && (
              <button
                onClick={onExportToAtlassian}
                className="flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                type="button"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.004 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12z"/>
                </svg>
                Export to JIRA / Confluence
              </button>
            )}
          </div>

          {!plan && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-semibold text-amber-900">No rescue plan generated yet</p>
                  <p className="mt-1 text-sm text-amber-700">
                    This task doesn&apos;t have a rescue plan. You can ask Gemini AI questions about the task below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ask Gemini AI */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ask Gemini AI
            </h3>
            <p className="mb-4 text-sm text-slate-600">
              Ask questions about this task, get advice on how to complete it, or request different approaches.
            </p>

            <div className="space-y-3">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="E.g., 'How can I break this down into smaller tasks?' or 'What's the best approach to complete this quickly?'"
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                rows={3}
              />

              <button
                onClick={handleAskGemini}
                disabled={isAskingGemini || !question.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                type="button"
              >
                {isAskingGemini ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Thinking...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Ask Gemini
                  </>
                )}
              </button>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {errorMessage}
                </div>
              )}

              {geminiResponse && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-900 mb-2">Gemini&apos;s Response:</p>
                      <div className="text-sm text-emerald-800 whitespace-pre-wrap">{geminiResponse}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
