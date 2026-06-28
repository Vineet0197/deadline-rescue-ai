import { clearCookie, destroySession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: Request) {
  await destroySession(request);

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearCookie(SESSION_COOKIE_NAME),
      },
    },
  );
}
