import { getAuthenticatedUserId } from "@/lib/auth/session";
import { GoogleCalendarProvider } from "@/lib/calendar/providers/google-calendar-provider";
import type { FocusBlock } from "@/lib/planner/planner";

type CreateFocusBlocksRequest = {
  focusBlocks: FocusBlock[];
};

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  const body = (await request.json()) as CreateFocusBlocksRequest;
  const provider = new GoogleCalendarProvider();

  if (!(await provider.isConnected(userId))) {
    return Response.json(
      {
        error: "Google Calendar is not connected.",
      },
      { status: 409 },
    );
  }

  const events = await provider.createFocusBlocks({
    userId,
    focusBlocks: body.focusBlocks,
  });

  return Response.json({ events });
}
