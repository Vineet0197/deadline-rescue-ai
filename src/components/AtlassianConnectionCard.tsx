"use client";

import { useEffect, useState } from "react";

type AtlassianResource = {
  id: string;
  name: string;
  url: string;
  scopes: string[];
};

type AtlassianConnectionProps = {
  disabled: boolean;
  onConnectionChange: (connected: boolean) => void;
};

export function AtlassianConnectionCard({ disabled, onConnectionChange }: AtlassianConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [resources, setResources] = useState<AtlassianResource[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  async function checkConnection() {
    setIsChecking(true);
    try {
      const response = await fetch("/api/atlassian/status");
      const data = await response.json() as { connected: boolean; resources: AtlassianResource[] };
      setIsConnected(data.connected);
      setResources(data.resources || []);
      onConnectionChange(data.connected);
    } catch (error) {
      console.error("Failed to check Atlassian connection:", error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (!disabled) {
      checkConnection();
    }
  }, [disabled]);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/atlassian/connect");
      const data = await response.json() as { authorizationUrl: string; error?: string };

      if (data.error) {
        alert(data.error);
        return;
      }

      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error("Failed to connect Atlassian:", error);
      alert("Failed to initiate Atlassian connection");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Atlassian Integration</h3>
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected
              ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              : "bg-slate-300"
          }`}
        />
      </div>
      <p className="mt-1 text-sm text-slate-600">Connect JIRA & Confluence</p>

      <div className="mt-4">
        <div className={`flex items-center gap-3 rounded-lg p-3 ${
          isConnected ? "bg-blue-50" : "bg-slate-50"
        }`}>
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
            isConnected ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
          }`}>
            {isChecking || isConnecting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.004 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-.883 17.854a7.254 7.254 0 01-2.483-.464v-3.022a4.654 4.654 0 002.483.706 3.547 3.547 0 001.882-.499l1.646 2.975a6.996 6.996 0 01-3.528.304zm7.238-4.697l-1.646 2.975a4.654 4.654 0 00-1.097-2.118 3.547 3.547 0 00-1.776-1.056V9.947a7.254 7.254 0 013.519 3.21z"/>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {isChecking ? "Checking..." : isConnected ? "Connected" : "Not Connected"}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {isConnected
                ? `${resources.length} site${resources.length !== 1 ? "s" : ""} available`
                : "Connect to export tasks to JIRA or Confluence"}
            </p>
          </div>
        </div>
      </div>

      {isConnected && resources.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-slate-700">Connected Sites:</p>
          <div className="mt-2 space-y-1">
            {resources.map((resource) => (
              <div key={resource.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="flex-1 truncate font-medium text-slate-900">{resource.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled || isConnecting}
        onClick={handleConnect}
        type="button"
      >
        {isConnecting ? "Connecting..." : isConnected ? "Reconnect Atlassian" : "Connect Atlassian"}
      </button>

      <p className="mt-3 text-xs text-slate-500">
        💡 After connecting, you can export rescue plans to JIRA tasks or Confluence pages
      </p>
    </div>
  );
}
