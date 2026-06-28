import { createOAuthStateCookie, createRandomToken } from "@/lib/auth/session";
import { getGithubAuthUrl } from "@/lib/auth/github-oauth";

export async function GET() {
  const state = createRandomToken();

  return Response.json(
    { authorizationUrl: getGithubAuthUrl(state) },
    {
      headers: {
        "Set-Cookie": createOAuthStateCookie(state),
      },
    },
  );
}
