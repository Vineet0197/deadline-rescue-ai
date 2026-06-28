"use client";

import { useState } from "react";
import type { StoredTask } from "@/lib/db/task-repository";

type TaskListProps = {
  tasks: StoredTask[];
  onTaskClick: (task: StoredTask) => void;
  onStatusChange: (taskId: string, status: StoredTask["status"]) => void;
  onRefresh: () => void;
};

export function TaskList({ tasks, onTaskClick, onStatusChange, onRefresh }: TaskListProps) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [sortBy, setSortBy] = useState<"deadline" | "created" | "priority">("deadline");

  const getStatusColor = (status: StoredTask["status"]) => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-700 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "scheduled":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "blocked":
        return "bg-red-100 text-red-700 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "highest":
        return "🔴";
      case "high":
        return "🟠";
      case "medium":
        return "🟡";
      default:
        return "🟢";
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.status === "done";
    if (filter === "active") return task.status !== "done" && task.status !== "cancelled";
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "deadline") {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === "created") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Priority
    const priorityOrder = { highest: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const stats = {
    total: tasks.length,
    active: tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
    completed: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate) && t.status !== "done").length,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with Stats */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
          <button
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            onClick={onRefresh}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-600">Total</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.active}</p>
            <p className="text-xs text-blue-600">Active</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            <p className="text-xs text-green-600">Done</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-xs text-red-600">Overdue</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            onChange={(e) => setFilter(e.target.value as any)}
            value={filter}
          >
            <option value="all">All Tasks</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            onChange={(e) => setSortBy(e.target.value as any)}
            value={sortBy}
          >
            <option value="deadline">Sort by Deadline</option>
            <option value="created">Sort by Created</option>
            <option value="priority">Sort by Priority</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        {sortedTasks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mt-4 font-medium text-slate-900">No tasks found</p>
              <p className="mt-1 text-sm text-slate-600">Create a task to get started</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <div
                className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-md"
                key={task.id}
                onClick={() => onTaskClick(task)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getPriorityIcon(task.priority)}</span>
                      <h3 className="font-semibold text-slate-900 truncate">{task.title}</h3>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={isOverdue(task.dueDate) && task.status !== "done" ? "text-red-600 font-medium" : ""}>
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{task.estimatedEffortHours}h</span>
                      </div>

                      {isOverdue(task.dueDate) && task.status !== "done" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <select
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${getStatusColor(task.status)}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onStatusChange(task.id, e.target.value as any)}
                      value={task.status}
                    >
                      <option value="todo">To Do</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="in-progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="done">Done</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                      className="rounded-lg px-2 py-1 text-emerald-600 opacity-0 transition hover:bg-emerald-50 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      type="button"
                    >
                      <span className="text-xs font-medium">View Plan →</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
