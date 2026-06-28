import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/db/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/?error=atlassian_auth_failed", request.url));
    }

    const clientId = process.env.ATLASSIAN_CLIENT_ID;
    const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
    const redirectUri = process.env.ATLASSIAN_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/atlassian/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/?error=atlassian_not_configured", request.url));
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(new URL("/?error=atlassian_token_failed", request.url));
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get accessible resources (sites)
    const resourcesResponse = await fetch(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/json",
        },
      }
    );

    const resources = await resourcesResponse.json() as Array<{
      id: string;
      name: string;
      url: string;
      scopes: string[];
    }>;

    // Store tokens in Firestore
    const db = adminDb;
    

    await db.collection("users").doc(user.id).collection("integrations").doc("atlassian").set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      resources,
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL("/?atlassian_connected=true", request.url));
  } catch (error) {
    console.error("Atlassian callback error:", error);
    return NextResponse.redirect(new URL("/?error=atlassian_callback_failed", request.url));
  }
}
