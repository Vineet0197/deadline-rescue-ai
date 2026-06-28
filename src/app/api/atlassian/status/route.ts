import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/db/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = adminDb;
    

    const doc = await db
      .collection("users")
      .doc(user.id)
      .collection("integrations")
      .doc("atlassian")
      .get();

    if (!doc.exists) {
      return NextResponse.json({ connected: false, resources: [] });
    }

    const data = doc.data();
    const isExpired = new Date(data?.expiresAt || 0) < new Date();

    return NextResponse.json({
      connected: !isExpired,
      resources: data?.resources || [],
      connectedAt: data?.connectedAt,
    });
  } catch (error) {
    console.error("Atlassian status check error:", error);
    return NextResponse.json({ connected: false, resources: [] });
  }
}
