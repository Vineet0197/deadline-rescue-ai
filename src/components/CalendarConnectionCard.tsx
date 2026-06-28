"use client";

type CalendarConnectionCardProps = {
  isConnected: boolean;
  isChecking: boolean;
  disabled: boolean;
  onConnect: () => void;
};

export function CalendarConnectionCard({
  isConnected,
  isChecking,
  disabled,
  onConnect,
}: CalendarConnectionCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Calendar Integration</h3>
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              : "bg-slate-300"
          }`}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
            isConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          }`}>
            {isChecking ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">
              {isChecking ? "Checking..." : isConnected ? "Google Calendar" : "Not Connected"}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {isConnected ? "Reading your availability" : "Connect to analyze free time"}
            </p>
          </div>
        </div>
      </div>

      <button
        className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled}
        onClick={onConnect}
        type="button"
      >
        {isConnected ? "Reconnect Calendar" : "Connect Calendar"}
      </button>
    </div>
  );
}
