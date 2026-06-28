"use client";

import type { Task } from "@/types/task";

type TaskFormProps = {
  title: string;
  dueDate: string;
  estimatedEffortHours: number;
  priority: Task["priority"];
  disabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onTitleChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onEstimatedEffortHoursChange: (value: number) => void;
  onPriorityChange: (value: Task["priority"]) => void;
};

export function TaskForm(props: TaskFormProps) {
  return (
    <form
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
          <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Create Task</h2>
          <p className="text-sm text-slate-600">Set your deadline and get an AI rescue plan</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Task Title</label>
          <input
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => props.onTitleChange(event.target.value)}
            placeholder="e.g. Complete product demo presentation"
            required
            type="text"
            value={props.title}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Deadline</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => props.onDueDateChange(event.target.value)}
              required
              type="datetime-local"
              value={props.dueDate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Effort (hours)</label>
            <input
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              min="1"
              onChange={(event) => props.onEstimatedEffortHoursChange(Number(event.target.value))}
              type="number"
              value={props.estimatedEffortHours}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Priority Level</label>
          <select
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => props.onPriorityChange(event.target.value as Task["priority"])}
            value={props.priority}
          >
            <option value="low">Low - Nice to have</option>
            <option value="medium">Medium - Important</option>
            <option value="high">High - Critical</option>
            <option value="highest">Highest - Urgent</option>
          </select>
        </div>

        <button
          className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 font-semibold text-white shadow-sm transition hover:from-emerald-700 hover:to-emerald-600 hover:shadow-md disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
          disabled={props.disabled || props.isSubmitting}
          type="submit"
        >
          {props.isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing & Planning...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Rescue Plan
            </span>
          )}
        </button>

        {props.disabled && !props.isSubmitting ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>Sign in and connect calendar to continue</span>
          </div>
        ) : null}
      </div>
    </form>
  );
}
