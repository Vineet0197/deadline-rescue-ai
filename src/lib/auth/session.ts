import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { adminDb } from "@/lib/db/firebase-admin";
import type { AuthProvider, PublicUser } from "@/types/auth";

export const SESSION_COOKIE_NAME = "deadline_rescue_session";
export const OAUTH_STATE_COOKIE_NAME = "deadline_rescue_oauth_state";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AppUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  createdAt: string;
  updatedAt: string;
};

type UserCreateInput = {
  email: string;
  provider: AuthProvider;
  name?: string;
  avatarUrl?: string;
  passwordHash?: string;
  passwordSalt?: string;
};

export function createCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearCookie(name: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function createOAuthStateCookie(state: string) {
  return createCookie(OAUTH_STATE_COOKIE_NAME, state, 10 * 60);
}

export function createSessionCookie(token: string) {
  return createCookie(SESSION_COOKIE_NAME, token, Math.floor(SESSION_TTL_MS / 1000));
}

export function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function createRandomToken() {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function userIdFor(provider: AuthProvider, email: string) {
  return createHash("sha256").update(`${provider}:${normalizeEmail(email)}`).digest("hex");
}

export async function findUserByEmail(email: string): Promise<(AppUser & { passwordHash?: string; passwordSalt?: string }) | null> {
  const snapshot = await adminDb
    .collection("users")
    .where("email", "==", normalizeEmail(email))
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...(snapshot.docs[0].data() as Omit<AppUser, "id">),
  };
}

export async function upsertOAuthUser(input: UserCreateInput): Promise<AppUser> {
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const id = userIdFor(input.provider, email);
  const userRef = adminDb.collection("users").doc(id);
  const snapshot = await userRef.get();
  const existing = snapshot.exists ? snapshot.data() : null;
  const user: AppUser = {
    id,
    email,
    provider: input.provider,
    name: input.name ?? existing?.name,
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await userRef.set(user, { merge: true });
  return user;
}

export async function createEmailUser(input: Required<Pick<UserCreateInput, "email" | "passwordHash" | "passwordSalt">>) {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new Error("User already exists.");
  }

  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);
  const id = userIdFor("email", email);
  const user = {
    id,
    email,
    provider: "email" as const,
    createdAt: now,
    updatedAt: now,
    passwordHash: input.passwordHash,
    passwordSalt: input.passwordSalt,
  };

  await adminDb.collection("users").doc(id).set(user);
  return user;
}

export async function createSession(userId: string) {
  const token = createRandomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await adminDb.collection("sessions").doc(hashToken(token)).set({
    userId,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return token;
}

export async function getSessionUser(request: Request): Promise<PublicUser | null> {
  const token = getCookie(request, SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  const sessionSnapshot = await adminDb.collection("sessions").doc(hashToken(token)).get();

  if (!sessionSnapshot.exists) {
    return null;
  }

  const session = sessionSnapshot.data() as { userId: string; expiresAt: string };

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const userSnapshot = await adminDb.collection("users").doc(session.userId).get();

  if (!userSnapshot.exists) {
    return null;
  }

  const user = userSnapshot.data() as AppUser;
  return {
    id: userSnapshot.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
  };
}

export async function getAuthenticatedUserId(request: Request): Promise<string> {
  const user = await getSessionUser(request);

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user.id;
}

export async function destroySession(request: Request) {
  const token = getCookie(request, SESSION_COOKIE_NAME);

  if (token) {
    await adminDb.collection("sessions").doc(hashToken(token)).delete();
  }
}

export function tokensEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}
