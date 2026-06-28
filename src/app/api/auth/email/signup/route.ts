import { createEmailUser, createSession, createSessionCookie } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

type EmailAuthRequest = {
  email: string;
  password: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as EmailAuthRequest;

  if (!body.email || !body.password || body.password.length < 8) {
    return Response.json({ error: "Email and 8+ character password are required." }, { status: 400 });
  }

  const password = hashPassword(body.password);
  const user = await createEmailUser({
    email: body.email,
    passwordHash: password.hash,
    passwordSalt: password.salt,
  });
  const token = await createSession(user.id);

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.email,
        provider: user.provider,
      },
    },
    {
      headers: {
        "Set-Cookie": createSessionCookie(token),
      },
    },
  );
}
