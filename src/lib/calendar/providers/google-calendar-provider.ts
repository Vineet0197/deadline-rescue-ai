import "server-only";
import { google } from "googleapis";
import { adminDb } from "@/lib/db/firebase-admin";
import type { CalendarEvent, FocusBlock } from "@/lib/planner/planner";
import type {
  CalendarConnection,
  CalendarProvider,
} from "@/lib/calendar/providers/calendar-provider";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID;
}

function getConnectionDoc(userId: string) {
  return adminDb
    .collection("users")
    .doc(userId)
    .collection("calendarConnections")
    .doc("google");
}

function hasRequiredScopes(connection: CalendarConnection) {
  return SCOPES.every((scope) => connection.scopes?.includes(scope));
}

export class GoogleCalendarProvider implements CalendarProvider {
  provider = "google" as const;

  async getAuthorizationUrl(userId: string, loginHint?: string): Promise<string> {
    const oauth2Client = getOAuthClient();

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      login_hint: loginHint,
      prompt: "consent",
      scope: SCOPES,
      state: userId,
    });
  }

  async handleOAuthCallback(params: {
    userId: string;
    code: string;
  }): Promise<CalendarConnection> {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(params.code);
    const connectionBase: CalendarConnection = {
      userId: params.userId,
      provider: "google",
      connectedEmail: "primary-calendar",
      clientId: getGoogleClientId(),
      scopes: tokens.scope?.split(" ") ?? [],
    };
    const connection = {
      ...connectionBase,
      ...(tokens.access_token ? { accessToken: tokens.access_token } : {}),
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      ...(tokens.expiry_date
        ? { expiresAt: new Date(tokens.expiry_date).toISOString() }
        : {}),
    };

    await getConnectionDoc(params.userId).set(connection, { merge: true });
    return connection;
  }

  async listBusyEvents(params: {
    userId: string;
    from: string;
    to: string;
  }): Promise<CalendarEvent[]> {
    const oauth2Client = await this.getAuthorizedClient(params.userId);
    const calendar = google.calendar({ auth: oauth2Client, version: "v3" });
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.from,
        timeMax: params.to,
        items: [{ id: "primary" }],
      },
    });

    const busySlots = response.data.calendars?.primary?.busy ?? [];

    return busySlots
      .filter((slot): slot is { start: string; end: string } =>
        Boolean(slot.start && slot.end),
      )
      .map((slot, index) => ({
        id: `google-busy-${index}-${slot.start}`,
        title: "Busy",
        start: slot.start,
        end: slot.end,
        isBusy: true,
      }));
  }

  async createFocusBlocks(params: {
    userId: string;
    focusBlocks: FocusBlock[];
  }): Promise<CalendarEvent[]> {
    const oauth2Client = await this.getAuthorizedClient(params.userId);
    const calendar = google.calendar({ auth: oauth2Client, version: "v3" });

    const createdEvents = await Promise.all(
      params.focusBlocks.map(async (block) => {
        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: `Focus: ${block.title}`,
            description: "Created by Deadline Rescue AI.",
            start: { dateTime: block.start },
            end: { dateTime: block.end },
          },
        });

        return {
          id: response.data.id ?? block.start,
          title: response.data.summary ?? `Focus: ${block.title}`,
          start: response.data.start?.dateTime ?? block.start,
          end: response.data.end?.dateTime ?? block.end,
          isBusy: true,
        };
      }),
    );

    return createdEvents;
  }

  async isConnected(userId: string): Promise<boolean> {
    const snapshot = await getConnectionDoc(userId).get();

    if (!snapshot.exists) {
      return false;
    }

    const connection = snapshot.data() as CalendarConnection;
    return Boolean(
      connection.refreshToken &&
        connection.clientId &&
        connection.clientId === getGoogleClientId() &&
        hasRequiredScopes(connection),
    );
  }

  private async getAuthorizedClient(userId: string) {
    const snapshot = await getConnectionDoc(userId).get();

    if (!snapshot.exists) {
      throw new Error("Google Calendar is not connected.");
    }

    const connection = snapshot.data() as CalendarConnection;

    if (!connection.refreshToken || connection.clientId !== getGoogleClientId()) {
      throw new Error("Google Calendar must be reconnected for the current OAuth client.");
    }

    if (!hasRequiredScopes(connection)) {
      throw new Error("Google Calendar must be reconnected with Calendar permissions.");
    }

    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.expiresAt
        ? new Date(connection.expiresAt).getTime()
        : undefined,
    });

    return oauth2Client;
  }
}
