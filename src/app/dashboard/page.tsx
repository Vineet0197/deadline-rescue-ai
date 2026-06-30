"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarConnectionCard } from "@/components/CalendarConnectionCard";
import { RescuePlanResult } from "@/components/RescuePlanResult";
import { TaskForm } from "@/components/TaskForm";
import { AtlassianConnectionCard } from "@/components/AtlassianConnectionCard";
import { AtlassianExportModal } from "@/components/AtlassianExportModal";
import { TaskDetailView } from "@/components/TaskDetailView";
import type { RescueAdvice } from "@/lib/ai/ai-planner";
import type { PublicUser } from "@/types/auth";
import type { FocusBlock, RescuePlan, Task } from "@/types/task";
import type { StoredTask } from "@/lib/db/task-repository";

type RescueResponse = {
  task: Task;
  plan: RescuePlan;
  advice: RescueAdvice;
};

export default function Dashboard() {
  const router = useRouter();
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
  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [isAtlassianConnected, setIsAtlassianConnected] = useState(false);
  const [atlassianResources, setAtlassianResources] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [showAtlassianExport, setShowAtlassianExport] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StoredTask | null>(null);
  const [selectedTaskPlan, setSelectedTaskPlan] = useState<RescuePlan | null>(null);
  const [selectedTaskAdvice, setSelectedTaskAdvice] = useState<RescueAdvice | null>(null);
  const [isLoadingTaskDetails, setIsLoadingTaskDetails] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [taskView, setTaskView] = useState<"active" | "archived">("active");
  const [archivedFilter, setArchivedFilter] = useState<"all" | "done" | "blocked" | "cancelled">("all");

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

        if (!data.user) {
          // Not authenticated, redirect to landing page
          router.push("/");
          return;
        }

        setUser(data.user);
        await checkCalendarConnection();
      } catch {
        router.push("/");
      } finally {
        setIsAuthReady(true);
      }
    }

    loadSession();
  }, [router]);

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
      setShowTaskForm(false);
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

  async function handleTaskClick(task: StoredTask) {
    setIsLoadingTaskDetails(true);
    setSelectedTask(task);

    try {
      // Fetch task details including rescue plan
      const response = await fetch(`/api/tasks/${task.id}/details`);
      const data = await response.json() as {
        task: StoredTask;
        plan: RescuePlan | null;
        advice?: RescueAdvice | null;
      };

      setSelectedTaskPlan(data.plan);
      setSelectedTaskAdvice(data.advice || null);
    } catch (error) {
      console.error("Failed to load task details:", error);
      setErrorMessage("Failed to load task details");
      setSelectedTaskPlan(null);
      setSelectedTaskAdvice(null);
    } finally {
      setIsLoadingTaskDetails(false);
    }
  }

  function handleCloseTaskDetail() {
    setSelectedTask(null);
    setSelectedTaskPlan(null);
    setSelectedTaskAdvice(null);
  }

  function handleTaskDetailExport() {
    setActiveTask(selectedTask);
    setPlan(selectedTaskPlan);
    setAdvice(selectedTaskAdvice);
    setShowAtlassianExport(true);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  const canGenerate = Boolean(user && isCalendarConnected);

  // Filter tasks based on view
  const activeTasks = tasks.filter(t =>
    t.status === "todo" || t.status === "in-progress" || t.status === "scheduled"
  );

  const archivedTasks = tasks.filter(t => {
    const matchesStatus = t.status === "done" || t.status === "blocked" || t.status === "cancelled";
    if (!matchesStatus) return false;

    if (archivedFilter === "all") return true;
    return t.status === archivedFilter;
  });

  // Categorize active tasks by risk/status
  const displayTasks = taskView === "active" ? activeTasks : archivedTasks;

  const criticalTasks = displayTasks.filter(t => {
    if (taskView === "archived") return false;
    const dueDate = new Date(t.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue < 24 || hoursUntilDue < t.estimatedEffortHours * 1.5;
  });

  const onTrackTasks = displayTasks.filter(t => {
    if (taskView === "archived") return false;
    const dueDate = new Date(t.dueDate);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue >= t.estimatedEffortHours * 1.5;
  });

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
          <p className="text-sm text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navbar - Fixed */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="rounded-lg border border-slate-300 p-2 transition hover:bg-slate-100"
              type="button"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Deadline Rescue AI</h1>
                <p className="text-xs text-slate-500">AI Productivity Companion</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-semibold">
              {user?.name?.[0] ?? user?.email[0].toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1">
        {/* Left Sidebar - Collapsible */}
        <aside
          className={`fixed inset-y-0 left-0 top-[73px] z-50 w-80 transform border-r border-slate-200 bg-white transition-transform duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            {/* User Profile */}
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-lg font-semibold">
                  {user?.name?.[0] ?? user?.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{user?.name ?? "User"}</p>
                  <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Settings & Integrations */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            </div>

            {/* Logout */}
            <div className="border-t border-slate-200 p-6">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl">

            {/* Create Task Button */}
            {!showTaskForm && !plan && (
              <button
                onClick={() => setShowTaskForm(true)}
                className="mb-8 flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Task
              </button>
            )}

          {/* Task Form */}
          {showTaskForm && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">Create Task</h3>
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="text-slate-500 hover:text-slate-700"
                  type="button"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
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
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="animate-slideIn mb-6 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
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
          )}

          {successMessage && (
            <div className="animate-slideIn mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
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
          )}

          {/* Rescue Plan Result */}
          {plan && (
            <div className="mb-8">
              <RescuePlanResult
                advice={advice}
                isWritingFocusBlocks={isWritingFocusBlocks}
                onAddFocusBlocks={() => showConfirmationModal(plan.focusBlocks)}
                plan={plan}
                task={activeTask}
              />
              {isAtlassianConnected && (
                <button
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-3 font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                  onClick={() => setShowAtlassianExport(true)}
                  type="button"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.004 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12z"/>
                  </svg>
                  Export to JIRA / Confluence
                </button>
              )}
              <button
                onClick={() => {
                  setPlan(null);
                  setAdvice(null);
                  setActiveTask(null);
                  setTitle("");
                  setDueDate("");
                }}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
                type="button"
              >
                Create Another Task
              </button>
            </div>
          )}

          {/* Tasks List */}
          {!showTaskForm && !plan && (
            <div className="space-y-6">
              {/* Task View Tabs */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setTaskView("active")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${
                    taskView === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  type="button"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Active Tasks ({activeTasks.length})
                </button>
                <button
                  onClick={() => setTaskView("archived")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition ${
                    taskView === "archived"
                      ? "bg-slate-100 text-slate-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                  type="button"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Archived ({archivedTasks.length})
                </button>
              </div>

              {/* Archived Filters */}
              {taskView === "archived" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">Filter:</span>
                  {(["all", "done", "blocked", "cancelled"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setArchivedFilter(filter)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium transition ${
                        archivedFilter === filter
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      type="button"
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-8">
              {/* Active View */}
              {taskView === "active" && (
                <>
                  {/* Critical Tasks */}
                  {criticalTasks.length > 0 && (
                    <section>
                      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
                        <span className="text-2xl">🚨</span>
                        Critical Tasks ({criticalTasks.length})
                      </h3>
                      <div className="grid gap-4">
                        {criticalTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => handleTaskClick(task)}
                            onStatusChange={handleTaskStatusChange}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* On Track Tasks */}
                  {onTrackTasks.length > 0 && (
                    <section>
                      <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
                        <span className="text-2xl">✅</span>
                        On Track ({onTrackTasks.length})
                      </h3>
                      <div className="grid gap-4">
                        {onTrackTasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onClick={() => handleTaskClick(task)}
                            onStatusChange={handleTaskStatusChange}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Archived View */}
              {taskView === "archived" && archivedTasks.length > 0 && (
                <section>
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
                    <span className="text-2xl">📦</span>
                    Archived Tasks ({archivedTasks.length})
                  </h3>
                  <div className="grid gap-4">
                    {archivedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        onStatusChange={handleTaskStatusChange}
                      />
                    ))}
                  </div>
                </section>
              )}

              {displayTasks.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {taskView === "active" ? "No active tasks" : "No archived tasks"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {taskView === "active"
                      ? "Create your first task to get started with AI-powered rescue planning"
                      : "Completed, blocked, or cancelled tasks will appear here"}
                  </p>
                </div>
              )}
              </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {showConfirmModal && pendingFocusBlocks.length > 0 && (
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
      )}

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

      {/* Task Detail View */}
      {selectedTask && !isLoadingTaskDetails && (
        <TaskDetailView
          task={selectedTask}
          plan={selectedTaskPlan}
          advice={selectedTaskAdvice}
          onClose={handleCloseTaskDetail}
          onAddFocusBlocks={(blocks) => {
            setPendingFocusBlocks(blocks);
            setShowConfirmModal(true);
          }}
          onExportToAtlassian={handleTaskDetailExport}
          isAtlassianConnected={isAtlassianConnected}
          isWritingFocusBlocks={isWritingFocusBlocks}
        />
      )}

      {/* Loading Task Details */}
      {isLoadingTaskDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"></div>
              <p className="text-sm text-slate-600">Loading task details...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onClick,
  onStatusChange,
}: {
  task: StoredTask;
  onClick: () => void;
  onStatusChange: (taskId: string, status: StoredTask["status"]) => void;
}) {
  const dueDate = new Date(task.dueDate);
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isOverdue = hoursUntilDue < 0;
  const isCritical = hoursUntilDue < 24 || hoursUntilDue < task.estimatedEffortHours * 1.5;

  const riskColor = isOverdue
    ? "border-red-300 bg-red-50"
    : isCritical
    ? "border-yellow-300 bg-yellow-50"
    : "border-emerald-300 bg-emerald-50";

  const priorityColors: Record<string, string> = {
    highest: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  const statusColors: Record<string, string> = {
    "not-started": "bg-slate-100 text-slate-700",
    "in-progress": "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    blocked: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
  };

  return (
    <div
      className={`cursor-pointer rounded-xl border-2 p-4 transition hover:shadow-md ${riskColor}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900">{task.title}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${priorityColors[task.priority]}`}>
              {task.priority.toUpperCase()}
            </span>
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusColors[task.status]}`}>
              {task.status.replace("-", " ").toUpperCase()}
            </span>
            <span className="text-xs text-slate-600">
              {task.estimatedEffortHours}h effort
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Due:</span> {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {isOverdue && <span className="ml-2 font-semibold text-red-700">(OVERDUE)</span>}
            {!isOverdue && isCritical && <span className="ml-2 font-semibold text-yellow-700">(TIGHT)</span>}
          </p>
        </div>
        <div className="ml-4" onClick={(e) => e.stopPropagation()}>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as StoredTask["status"])}
          >
            <option value="not-started">Not Started</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>
  );
}
