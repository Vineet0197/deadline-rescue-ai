import { getSessionUser } from "@/lib/auth/session";
import { GoogleCalendarProvider } from "@/lib/calendar/providers/google-calendar-provider";

export async function GET(request: Request) {
  const user = await getSessionUser(request);

  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const provider = new GoogleCalendarProvider();
  const authorizationUrl = await provider.getAuthorizationUrl(user.id, user.email);

  return Response.json({ authorizationUrl });
}
