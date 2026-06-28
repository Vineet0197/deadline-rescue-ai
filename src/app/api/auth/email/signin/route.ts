import { verifyPassword } from "@/lib/auth/password";
import { createSession, createSessionCookie, findUserByEmail } from "@/lib/auth/session";

type EmailAuthRequest = {
  email: string;
  password: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as EmailAuthRequest;
  const user = await findUserByEmail(body.email);

  if (!user?.passwordHash || !user.passwordSalt || !verifyPassword(body.password, user.passwordSalt, user.passwordHash)) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSession(user.id);

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
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
