import { getAuthenticatedUserId } from "@/lib/auth/session";
import { GoogleCalendarProvider } from "@/lib/calendar/providers/google-calendar-provider";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  const provider = new GoogleCalendarProvider();
  const connected = await provider.isConnected(userId);

  return Response.json({ connected });
}
