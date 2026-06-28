import type { CalendarEvent, FocusBlock } from "@/lib/planner/planner";

export type CalendarProviderId = "google" | "outlook" | "apple" | "ics";

export type CalendarConnection = {
  userId: string;
  provider: CalendarProviderId;
  connectedEmail: string;
  clientId?: string;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
};

export interface CalendarProvider {
  provider: CalendarProviderId;

  getAuthorizationUrl(userId: string, loginHint?: string): Promise<string>;

  handleOAuthCallback(params: {
    userId: string;
    code: string;
  }): Promise<CalendarConnection>;

  listBusyEvents(params: {
    userId: string;
    from: string;
    to: string;
  }): Promise<CalendarEvent[]>;

  createFocusBlocks(params: {
    userId: string;
    focusBlocks: FocusBlock[];
  }): Promise<CalendarEvent[]>;
}
