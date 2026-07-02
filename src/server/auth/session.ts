import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export interface ServerSession {
  user: SessionUser;
  session: {
    id: string;
    expiresAt: Date;
  };
}

export async function getServerSession(): Promise<ServerSession | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || !session.session) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    },
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt,
    },
  };
}

export async function requireServerSession(): Promise<ServerSession> {
  const session = await getServerSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}
