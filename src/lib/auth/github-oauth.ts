import "server-only";

export function getGithubAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID ?? "",
    redirect_uri: process.env.GITHUB_AUTH_REDIRECT_URI ?? "",
    scope: "read:user user:email",
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubCode(code: string) {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri: process.env.GITHUB_AUTH_REDIRECT_URI,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error("GitHub OAuth token exchange failed.");
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };
  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }),
  ]);

  if (!profileResponse.ok || !emailsResponse.ok) {
    throw new Error("GitHub profile fetch failed.");
  }

  const profile = (await profileResponse.json()) as {
    name?: string;
    login: string;
    avatar_url?: string;
  };
  const emails = (await emailsResponse.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;
  const email = emails.find((item) => item.primary && item.verified)?.email ?? emails[0]?.email;

  if (!email) {
    throw new Error("GitHub account has no accessible email.");
  }

  return {
    email,
    name: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url,
  };
}
