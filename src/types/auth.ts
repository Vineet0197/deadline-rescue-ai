export type AuthProvider = "email" | "google" | "github";

export type PublicUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: AuthProvider;
};
