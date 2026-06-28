"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { CalendarConnectionCard } from "@/components/CalendarConnectionCard";
import { RescuePlanResult } from "@/components/RescuePlanResult";
import { TaskForm } from "@/components/TaskForm";
import { TaskList } from "@/components/TaskList";
import { AtlassianConnectionCard } from "@/components/AtlassianConnectionCard";
import { AtlassianExportModal } from "@/components/AtlassianExportModal";
import type { RescueAdvice } from "@/lib/ai/ai-planner";
import type { PublicUser } from "@/types/auth";
import type { FocusBlock, RescuePlan, Task } from "@/types/task";
import type { StoredTask } from "@/lib/db/task-repository";

type RescueResponse = {
  task: Task;
  plan: RescuePlan;
  advice: RescueAdvice;
};

export default function Home() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedEffortHours, setEstimatedEffortHours] = useState(8);
  const [priority, setPriority] = useState<Task["priority"]>("highest");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [plan, setPlan] = useState<RescuePlan | null>(null);
  const [advice, setAdvice] = useState<RescueAdvice | null>(null);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isCheckingCalendar, setIsCheckingCalendar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWritingFocusBlocks, setIsWritingFocusBlocks] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFocusBlocks, setPendingFocusBlocks] = useState<FocusBlock[]>([]);
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [isAtlassianConnected, setIsAtlassianConnected] = useState(false);
  const [atlassianResources, setAtlassianResources] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [showAtlassianExport, setShowAtlassianExport] = useState(false);

  function toIsoFromLocalDateTime(value: string) {
    return new Date(value).toISOString();
  }

  async function checkCalendarConnection() {
    setIsCheckingCalendar(true);

    try {
      const response = await fetch("/api/calendar/google/status");
      const data = (await response.json()) as { connected: boolean };
      setIsCalendarConnected(data.connected);
    } catch {
      setIsCalendarConnected(false);
    } finally {
      setIsCheckingCalendar(false);
    }
  }

  async function loadTasks() {
    if (!user) return;

    try {
      const response = await fetch("/api/tasks");
      const data = (await response.json()) as { tasks: StoredTask[] };
      setTasks(data.tasks);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  }

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me");
        const data = (await response.json()) as { user: PublicUser | null };
        setUser(data.user);

        if (data.user) {
          await checkCalendarConnection();
        } else {
          setIsCalendarConnected(false);
        }
      } catch {
        setUser(null);
        setIsCalendarConnected(false);
      } finally {
        setIsAuthReady(true);
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadTasks();
      checkAtlassianConnection();
    }
  }, [user]);

  async function checkAtlassianConnection() {
    if (!user) return;

    try {
      const response = await fetch("/api/atlassian/status");
      const data = await response.json() as { connected: boolean; resources: Array<{ id: string; name: string; url: string }> };
      setIsAtlassianConnected(data.connected);
      setAtlassianResources(data.resources || []);
    } catch (error) {
      console.error("Failed to check Atlassian connection:", error);
    }
  }

  function handleAtlassianExportSuccess(type: "jira" | "confluence", url: string) {
    setShowAtlassianExport(false);
    setSuccessMessage(
      `🎉 Successfully exported to ${type === "jira" ? "JIRA" : "Confluence"}! View at: ${url}`
    );
  }

  function handleAuthChange(nextUser: PublicUser | null) {
    setUser(nextUser);
    setPlan(null);
    setAdvice(null);
    setActiveTask(null);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (nextUser) {
      checkCalendarConnection();
    } else {
      setIsCalendarConnected(false);
    }
  }

  async function handleConnectCalendar() {
    if (!user) {
      setErrorMessage("Sign in before connecting Google Calendar.");
      return;
    }

    setErrorMessage(null);
    const response = await fetch("/api/calendar/google/connect");
    const data = (await response.json()) as { authorizationUrl: string };
    window.location.href = data.authorizationUrl;
  }

  async function handleGeneratePlan() {
    if (!user) {
      setErrorMessage("Sign in before generating a rescue plan.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!title.trim() || !dueDate) {
        throw new Error("Enter a task title and due date before generating a rescue plan.");
      }

      const response = await fetch("/api/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dueDate: toIsoFromLocalDateTime(dueDate),
          estimatedEffortHours,
          priority,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        let errorMsg = data.error ?? "Failed to generate rescue plan.";

        // Handle Gemini API errors gracefully
        if (errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE")) {
          errorMsg = "AI service is experiencing high demand. Please try again in a moment.";
        }
        throw new Error(errorMsg);
      }

      const data = (await response.json()) as RescueResponse;
      setActiveTask(data.task);
      setPlan(data.plan);
      setAdvice(data.advice);
      await loadTasks(); // Refresh task list
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Could not generate a rescue plan.";
      setErrorMessage(errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE")
        ? "⏳ AI service is busy. Please try again in a moment."
        : errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function showConfirmationModal(focusBlocks: FocusBlock[]) {
    setPendingFocusBlocks(focusBlocks);
    setShowConfirmModal(true);
  }

  async function handleAddFocusBlocks() {
    if (!user) {
      setErrorMessage("Sign in before adding focus blocks.");
      return;
    }

    setIsWritingFocusBlocks(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfirmModal(false);

    try {
      const response = await fetch("/api/calendar/google/focus-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusBlocks: pendingFocusBlocks }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to add focus blocks.");
      }

      setSuccessMessage("🎉 Focus blocks added to Google Calendar successfully!");
      setPendingFocusBlocks([]);
    } catch {
      setErrorMessage("Could not add focus blocks to Google Calendar.");
    } finally {
      setIsWritingFocusBlocks(false);
    }
  }

  async function handleTaskStatusChange(taskId: string, status: StoredTask["status"]) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadTasks();
    } catch (error) {
      console.error("Failed to update task status:", error);
      setErrorMessage("Failed to update task status");
    }
  }

  function handleTaskClick(task: StoredTask) {
    // Load the task's rescue plan
    setTitle(task.title);
    setDueDate(new Date(task.dueDate).toISOString().slice(0, 16));
    setEstimatedEffortHours(task.estimatedEffortHours);
    setPriority(task.priority);
    setShowTaskDrawer(false);
    // TODO: Load existing plan if available
  }

  const canGenerate = Boolean(user && isCalendarConnected);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">FocusForge</h1>
              <p className="text-xs text-slate-500">AI-Powered Task Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIndicator label="Auth" isActive={Boolean(user)} />
              <StatusIndicator label="Calendar" isActive={isCalendarConnected} />
            </div>
            {user && (
              <>
                <button
                  className="relative rounded-lg bg-slate-100 p-2 transition hover:bg-slate-200"
                  onClick={() => setShowTaskDrawer(true)}
                  type="button"
                >
                  <svg className="h-5 w-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {tasks.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                      {tasks.length}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-semibold">
                    {user.name?.[0] ?? user.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{user.name ?? user.email}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Sidebar - Auth & Settings */}
          <aside className="flex flex-col gap-6">{/* Sidebar content */}

            <AuthPanel onAuthChange={handleAuthChange} user={user} />
            <CalendarConnectionCard
              disabled={!user || isCheckingCalendar}
              isChecking={isCheckingCalendar || !isAuthReady}
              isConnected={isCalendarConnected}
              onConnect={handleConnectCalendar}
            />
            <AtlassianConnectionCard
              disabled={!user}
              onConnectionChange={(connected) => {
                setIsAtlassianConnected(connected);
                if (connected) {
                  checkAtlassianConnection();
                }
              }}
            />
          </aside>

          {/* Main Content Area */}
          <div className="flex flex-col gap-6">
            <TaskForm
              disabled={!canGenerate}
              dueDate={dueDate}
              estimatedEffortHours={estimatedEffortHours}
              isSubmitting={isSubmitting}
              onDueDateChange={setDueDate}
              onEstimatedEffortHoursChange={setEstimatedEffortHours}
              onPriorityChange={setPriority}
              onSubmit={handleGeneratePlan}
              onTitleChange={setTitle}
              priority={priority}
              title={title}
            />

            {errorMessage ? (
              <div className="animate-slideIn rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <p className="flex-1 text-red-800">{errorMessage}</p>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => setErrorMessage(null)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : null}

            {successMessage ? (
              <div className="animate-slideIn rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-emerald-900">{successMessage}</p>
                  <button
                    className="text-emerald-600 hover:text-emerald-800"
                    onClick={() => setSuccessMessage(null)}
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : null}

            {plan ? (
              <>
                <RescuePlanResult
                  advice={advice}
                  isWritingFocusBlocks={isWritingFocusBlocks}
                  onAddFocusBlocks={() => showConfirmationModal(plan.focusBlocks)}
                  plan={plan}
                  task={activeTask}
                />
                {isAtlassianConnected && (
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                    onClick={() => setShowAtlassianExport(true)}
                    type="button"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.004 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12z"/>
                    </svg>
                    Export to JIRA / Confluence
                  </button>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mx-auto max-w-xl text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100">
                    <svg className="h-10 w-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-slate-900">No Active Rescue Plan</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create a task above to generate an AI-powered rescue plan with intelligent focus block scheduling.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showConfirmModal && pendingFocusBlocks.length > 0 ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-2xl font-bold text-slate-900">Confirm Calendar Addition</h3>
              <p className="mt-2 text-slate-600">
                You&apos;re about to add {pendingFocusBlocks.length} focus block
                {pendingFocusBlocks.length !== 1 ? "s" : ""} to your Google Calendar:
              </p>
              <div className="mt-4 space-y-3">
                {pendingFocusBlocks.map((block) => (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={block.start}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{block.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {new Date(block.start).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          -{" "}
                          {new Date(block.end).toLocaleString(undefined, {
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {block.durationHours.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold transition hover:bg-slate-100"
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingFocusBlocks([]);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800"
                  onClick={handleAddFocusBlocks}
                  type="button"
                >
                  Add to Calendar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Toast Notifications Area */}
      {(errorMessage || successMessage) && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md">
          {errorMessage && (
            <div className="animate-slideIn mb-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <p className="flex-1 text-sm text-red-800">{errorMessage}</p>
                <button
                  className="text-red-600 hover:text-red-800"
                  onClick={() => setErrorMessage(null)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          {successMessage && (
            <div className="animate-slideIn rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm text-emerald-900">{successMessage}</p>
                <button
                  className="text-emerald-600 hover:text-emerald-800"
                  onClick={() => setSuccessMessage(null)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Drawer */}
      {showTaskDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTaskDrawer(false)}
          />
          <div className="w-full max-w-md animate-slideIn bg-white shadow-2xl">
            <TaskList
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onStatusChange={handleTaskStatusChange}
              onRefresh={loadTasks}
            />
          </div>
        </div>
      )}

      {/* Atlassian Export Modal */}
      {showAtlassianExport && (
        <AtlassianExportModal
          task={activeTask}
          plan={plan}
          advice={advice}
          resources={atlassianResources}
          onClose={() => setShowAtlassianExport(false)}
          onSuccess={handleAtlassianExportSuccess}
        />
      )}
    </div>
  );
}

function StatusIndicator({ label, isActive }: { label: string; isActive: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-2 w-2 rounded-full ${
          isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300"
        }`}
      />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </div>
  );
}
