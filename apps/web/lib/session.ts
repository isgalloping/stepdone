import { cookies } from "next/headers";
import { prisma } from "@stepdone/database";
import { verifySession, hashToken } from "@stepdone/auth";
import { ErrorCodes } from "@stepdone/domain";

export const SESSION_COOKIE = "stepdone_session";

export type AuthUser = {
  id: bigint;
  publicId: string;
  displayName: string | null;
};

export async function requireUser(): Promise<AuthUser> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    throw Object.assign(new Error(ErrorCodes.AUTH_REQUIRED), {
      code: ErrorCodes.AUTH_REQUIRED,
      status: 401,
    });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET missing");
  }

  const payload = verifySession(token, secret);
  if (!payload) {
    throw Object.assign(new Error(ErrorCodes.AUTH_REQUIRED), {
      code: ErrorCodes.AUTH_REQUIRED,
      status: 401,
    });
  }

  const session = await prisma.userSession.findFirst({
    where: {
      publicId: payload.sessionPublicId,
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session || session.user.publicId !== payload.userPublicId) {
    throw Object.assign(new Error(ErrorCodes.AUTH_REQUIRED), {
      code: ErrorCodes.AUTH_REQUIRED,
      status: 401,
    });
  }

  return {
    id: session.user.id,
    publicId: session.user.publicId,
    displayName: session.user.displayName,
  };
}

export function cookieOptions(maxAgeSeconds: number) {
  const secure = process.env.APP_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
