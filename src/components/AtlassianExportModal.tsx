"use client";

import { useState } from "react";
import type { RescueAdvice, RescuePlan, Task } from "@/types/task";

type AtlassianExportModalProps = {
  task: Task | null;
  plan: RescuePlan | null;
  advice: RescueAdvice | null;
  resources: Array<{ id: string; name: string; url: string }>;
  onClose: () => void;
  onSuccess: (type: "jira" | "confluence", url: string) => void;
};

export function AtlassianExportModal({
  task,
  plan,
  advice,
  resources,
  onClose,
  onSuccess,
}: AtlassianExportModalProps) {
  const [exportType, setExportType] = useState<"jira" | "confluence">("jira");
  const [selectedResource, setSelectedResource] = useState(resources[0]?.id || "");
  const [projectKey, setProjectKey] = useState("");
  const [spaceKey, setSpaceKey] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (!task) return;

    setIsExporting(true);
    setError(null);

    try {
      const endpoint =
        exportType === "jira"
          ? "/api/atlassian/jira/create"
          : "/api/atlassian/confluence/create";

      const payload =
        exportType === "jira"
          ? {
              cloudId: selectedResource,
              projectKey,
              task,
              plan,
              advice,
            }
          : {
              cloudId: selectedResource,
              spaceKey,
              task,
              plan,
              advice,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Export failed");
      }

      const result = await response.json();
      const url = exportType === "jira" ? result.issueUrl : result.pageUrl;
      onSuccess(exportType, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Export to Atlassian</h2>
          <button
            className="rounded-lg p-1 text-slate-600 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Export As</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                className={`flex items-center gap-2 rounded-lg border p-3 transition ${
                  exportType === "jira"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setExportType("jira")}
                type="button"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.004 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12z"/>
                </svg>
                <span className="font-medium">JIRA Task</span>
              </button>
              <button
                className={`flex items-center gap-2 rounded-lg border p-3 transition ${
                  exportType === "confluence"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setExportType("confluence")}
                type="button"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.87 16.207a1.44 1.44 0 00-.24 1.591l1.755 3.027a1.433 1.433 0 002.411.156c.837-1.184 2.02-2.939 3.357-4.848.914-1.304 2.727-1.433 3.753-.299.717.793.66 2.015-.126 2.729-1.557 1.412-2.474 2.271-2.99 2.848-.665.744-.458 1.943.456 2.343l3.306 1.446c.637.28 1.382.078 1.764-.475 1.498-2.162 4.163-6.088 6.336-9.466 1.162-1.808.607-4.257-1.238-5.461-1.846-1.204-4.336-.626-5.498 1.182-2.173 3.378-4.838 7.304-6.336 9.466l-.008.013-.014.019z"/>
                </svg>
                <span className="font-medium">Confluence Page</span>
              </button>
            </div>
          </div>

          {/* Site Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Atlassian Site</label>
            <select
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              onChange={(e) => setSelectedResource(e.target.value)}
              value={selectedResource}
            >
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project/Space Key */}
          {exportType === "jira" ? (
            <div>
              <label className="block text-sm font-medium text-slate-700">JIRA Project Key</label>
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                onChange={(e) => setProjectKey(e.target.value)}
                placeholder="e.g. PROJ"
                type="text"
                value={projectKey}
              />
              <p className="mt-1 text-xs text-slate-500">Enter the project key (e.g., PROJ, DEV, TASK)</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700">Confluence Space Key</label>
              <input
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                onChange={(e) => setSpaceKey(e.target.value)}
                placeholder="e.g. TEAM"
                type="text"
                value={spaceKey}
              />
              <p className="mt-1 text-xs text-slate-500">Enter the space key where the page will be created</p>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Preview</p>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Title:</span>
                <span className="font-medium text-slate-900">{task?.title || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Type:</span>
                <span className="font-medium text-slate-900">
                  {exportType === "jira" ? "Task" : "Page"}
                </span>
              </div>
              {plan && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Focus Blocks:</span>
                  <span className="font-medium text-slate-900">{plan.focusBlocks.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={
                isExporting ||
                !selectedResource ||
                (exportType === "jira" ? !projectKey : !spaceKey)
              }
              onClick={handleExport}
              type="button"
            >
              {isExporting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exporting...
                </span>
              ) : (
                `Export to ${exportType === "jira" ? "JIRA" : "Confluence"}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
