import { prisma } from "@stepdone/database";
import { hashToken, verifySession } from "@stepdone/auth";
import { cookies } from "next/headers";
import { jsonOk } from "@/lib/api";
import { SESSION_COOKIE, cookieOptions } from "@/lib/session";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET;
  if (token && secret) {
    const payload = verifySession(token, secret);
    if (payload) {
      await prisma.userSession.updateMany({
        where: {
          publicId: payload.sessionPublicId,
          tokenHash: hashToken(token),
        },
        data: { revokedAt: new Date() },
      });
    }
  }
  const response = jsonOk({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  return response;
}
