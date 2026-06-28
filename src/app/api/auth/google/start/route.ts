import { createOAuthStateCookie, createRandomToken } from "@/lib/auth/session";
import { getGoogleAuthUrl } from "@/lib/auth/google-oauth";

export async function GET() {
  try {
    const state = createRandomToken();

    return Response.json(
      { authorizationUrl: getGoogleAuthUrl(state) },
      {
        headers: {
          "Set-Cookie": createOAuthStateCookie(state),
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Google sign-in is not configured.",
      },
      { status: 500 },
    );
  }
}
