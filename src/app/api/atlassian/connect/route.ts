import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Atlassian OAuth 2.0 configuration
    const clientId = process.env.ATLASSIAN_CLIENT_ID;
    const redirectUri = process.env.ATLASSIAN_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/atlassian/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: "Atlassian integration not configured" },
        { status: 500 }
      );
    }

    // OAuth 2.0 scopes for JIRA and Confluence
    const scopes = [
      "read:jira-work",
      "write:jira-work",
      "read:confluence-content.all",
      "write:confluence-content",
      "read:confluence-space.summary",
      "offline_access", // For refresh token
    ].join(" ");

    const state = crypto.randomUUID();

    // Store state in session for verification
    const authUrl = new URL("https://auth.atlassian.com/authorize");
    authUrl.searchParams.set("audience", "api.atlassian.com");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("prompt", "consent");

    return NextResponse.json({ authorizationUrl: authUrl.toString() });
  } catch (error) {
    console.error("Atlassian connect error:", error);
    return NextResponse.json(
      { error: "Failed to initialize Atlassian connection" },
      { status: 500 }
    );
  }
}
