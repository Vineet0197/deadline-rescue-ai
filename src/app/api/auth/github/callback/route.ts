import { exchangeGithubCode } from "@/lib/auth/github-oauth";
import {
  clearCookie,
  createSession,
  createSessionCookie,
  getCookie,
  OAUTH_STATE_COOKIE_NAME,
  tokensEqual,
  upsertOAuthUser,
} from "@/lib/auth/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = getCookie(request, OAUTH_STATE_COOKIE_NAME);

  if (!code || !state || !expectedState || !tokensEqual(state, expectedState)) {
    return Response.redirect(new URL("/?auth=error", url.origin));
  }

  const profile = await exchangeGithubCode(code);
  const user = await upsertOAuthUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    provider: "github",
  });
  const token = await createSession(user.id);
  const headers = new Headers({
    Location: new URL("/", url.origin).toString(),
  });
  headers.append("Set-Cookie", createSessionCookie(token));
  headers.append("Set-Cookie", clearCookie(OAUTH_STATE_COOKIE_NAME));

  return new Response(null, { headers, status: 302 });
}
