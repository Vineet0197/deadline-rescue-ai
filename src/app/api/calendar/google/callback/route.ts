import { GoogleCalendarProvider } from "@/lib/calendar/providers/google-calendar-provider";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const userId = url.searchParams.get("state");

  if (!code || !userId) {
    return Response.redirect(new URL("/?calendar=error", url.origin));
  }

  await new GoogleCalendarProvider().handleOAuthCallback({
    userId,
    code,
  });

  return Response.redirect(new URL("/?calendar=connected", url.origin));
}
