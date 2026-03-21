export interface User {
  id: string;
  name: string;
  role: "ADMIN" | "USER";
}

export const mockUser: User = {
  id: "u-001",
  name: "test",
  role: "ADMIN",
};

const SESSION_COOKIE = "nicc_session";

export async function getSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session || session.value !== "active") {
    return null;
  }

  return { user: mockUser };
}

export async function login() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "active", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
}

export async function logout() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
