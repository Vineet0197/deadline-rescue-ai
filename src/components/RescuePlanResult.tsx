"use client";

import { useState } from "react";
import type { RescueAdvice, RescuePlan, Task } from "@/types/task";

type RescuePlanResultProps = {
  advice: RescueAdvice | null;
  isWritingFocusBlocks: boolean;
  onAddFocusBlocks: () => void;
  plan: RescuePlan;
  task: Task | null;
};

export function RescuePlanResult({
  advice,
  isWritingFocusBlocks,
  onAddFocusBlocks,
  plan,
  task,
}: RescuePlanResultProps) {
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const exampleQuestions = [
    "What should I do first?",
    "How can I reduce scope?",
    "What can I skip if I'm running out of time?",
    "Create a demo script for this task",
  ];

  async function askGemini() {
    if (!task || !chatQuestion.trim()) {
      return;
    }

    setIsChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch("/api/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          question: chatQuestion,
          task,
          plan,
          advice,
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok || !data.answer) {
        // Parse error for user-friendly message
        let errorMsg = "Gemini could not answer right now.";
        if (data.error) {
          try {
            const errorObj = JSON.parse(data.error);
            if (errorObj.error?.status === "UNAVAILABLE" || errorObj.error?.code === 503) {
              errorMsg = "Gemini is experiencing high demand right now. Please try again in a few moments.";
            } else if (errorObj.error?.message) {
              errorMsg = errorObj.error.message;
            }
          } catch {
            errorMsg = data.error.includes("high demand")
              ? "Gemini is experiencing high demand. Please try again in a few moments."
              : data.error;
          }
        }
        throw new Error(errorMsg);
      }

      setChatAnswer(data.answer);
      setChatQuestion("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Gemini could not answer right now.";
      setChatError(errorMsg.includes("high demand")
        ? "⏳ Gemini is busy right now. Please try again in a moment."
        : errorMsg);
    } finally {
      setIsChatLoading(false);
    }
  }

  const getRiskConfig = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return {
          color: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          badge: "bg-green-100 text-green-700",
        };
      case "medium":
        return {
          color: "text-yellow-700",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          badge: "bg-yellow-100 text-yellow-700",
        };
      case "high":
        return {
          color: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          badge: "bg-red-100 text-red-700",
        };
      default:
        return {
          color: "text-slate-700",
          bgColor: "bg-slate-50",
          borderColor: "border-slate-200",
          badge: "bg-slate-100 text-slate-700",
        };
    }
  };

  const riskConfig = getRiskConfig(plan.risk);

  return (
    <div className="space-y-6">
      {/* Risk Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Deadline Analysis</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${riskConfig.badge}`}>
                {plan.risk} Risk
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{plan.riskReason}</p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 px-4 py-3 text-center">
            <p className="text-xs font-medium text-emerald-700">Priority Score</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{plan.priorityScore}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Required Effort"
            value={`${plan.requiredHours.toFixed(1)}h`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Available Time"
            value={`${plan.availableHours.toFixed(1)}h`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            label="Unscheduled"
            value={`${plan.remainingUnscheduledHours.toFixed(1)}h`}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Focus Blocks Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Focus Blocks</h3>
            <p className="text-sm text-slate-600">{plan.focusBlocks.length} sessions scheduled</p>
          </div>
        </div>

        {plan.focusBlocks.length > 0 ? (
          <>
            <div className="mt-6 space-y-3">
              {plan.focusBlocks.map((block, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  key={block.start}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900">{block.title}</h4>
                    {block.description && (
                      <p className="mt-0.5 text-xs text-emerald-600">{block.description}</p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDateTime(block.start)} - {formatTime(block.end)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                      {block.durationHours.toFixed(1)}h
                    </div>
                    {block.durationHours >= 2.5 && (
                      <span className="text-xs text-blue-600">Deep Work</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
              disabled={isWritingFocusBlocks}
              onClick={onAddFocusBlocks}
              type="button"
            >
              {isWritingFocusBlocks ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding to Calendar...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add {plan.focusBlocks.length} Blocks to Google Calendar
                </>
              )}
            </button>
          </>
        ) : (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-center">
            <svg className="mx-auto h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 font-medium text-red-900">No Time Available</p>
            <p className="mt-1 text-sm text-red-700">Cannot schedule focus blocks before this deadline</p>
          </div>
        )}
      </div>

      {/* AI Advice Card */}
      {advice && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
              <p className="text-sm text-slate-600">Powered by Gemini</p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Summary</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{advice.summary}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900">Next Best Action</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{advice.nextBestAction}</p>
            </div>

            {advice.taskBreakdown?.subtasks && advice.taskBreakdown.subtasks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Task Breakdown</h4>
                <div className="mt-3 space-y-2">
                  {advice.taskBreakdown.subtasks.map((subtask) => (
                    <div
                      className="flex items-start gap-3 rounded-lg bg-slate-50 p-3"
                      key={`${subtask.order}-${subtask.title}`}
                    >
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {subtask.order}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{subtask.title}</p>
                        <p className="mt-0.5 text-xs text-slate-600">{subtask.estimatedHours}h estimated</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {advice.scopeReductionIdeas.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Scope Reduction Ideas</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {advice.scopeReductionIdeas.map((idea) => (
                      <li className="flex items-start gap-2" key={idea}>
                        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        <span>{idea}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {advice.productivityTips.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Productivity Tips</h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {advice.productivityTips.map((tip) => (
                      <li className="flex items-start gap-2" key={tip}>
                        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 className="text-sm font-semibold text-slate-900">Ask Follow-up Questions</h4>
            <p className="mt-1 text-xs text-slate-600">Get personalized advice from Gemini</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {exampleQuestions.map((question) => (
                <button
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!task || isChatLoading}
                  key={question}
                  onClick={() => {
                    setChatQuestion(question);
                    setChatAnswer(null);
                    setChatError(null);
                  }}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                askGemini();
              }}
            >
              <input
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                disabled={!task || isChatLoading}
                onChange={(event) => setChatQuestion(event.target.value)}
                placeholder="Ask anything about this task..."
                value={chatQuestion}
              />
              <button
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!task || isChatLoading || !chatQuestion.trim()}
                type="submit"
              >
                {isChatLoading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Asking
                  </span>
                ) : (
                  "Ask"
                )}
              </button>
            </form>

            {chatError && (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">Response Unavailable</p>
                  <p className="mt-1 text-sm text-amber-700">{chatError}</p>
                  <p className="mt-2 text-xs text-amber-600">💡 Tip: The system will automatically retry if the service is temporarily busy.</p>
                </div>
              </div>
            )}
            {chatAnswer && (
              <div className="mt-3 rounded-lg bg-purple-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Gemini Response</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">{chatAnswer}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
