import type { PrismaClient } from "@stepdone/database";
import { newPublicId } from "@stepdone/database";
import { hashToken, signSession } from "./session";

export async function mockLogin(
  prisma: PrismaClient,
  secret: string,
  displayName = "演示用户",
): Promise<{ userPublicId: string; sessionToken: string; sessionPublicId: string }> {
  const userPublicId = newPublicId();
  const sessionPublicId = newPublicId();
  const providerUserId = `mock_${userPublicId}`;

  const user = await prisma.user.create({
    data: {
      publicId: userPublicId,
      displayName,
      status: "ACTIVE",
      identities: {
        create: {
          provider: "MOCK",
          providerUserId,
        },
      },
    },
  });

  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const sessionToken = signSession(
    { userPublicId: user.publicId, sessionPublicId, exp },
    secret,
  );

  await prisma.userSession.create({
    data: {
      publicId: sessionPublicId,
      userId: user.id,
      tokenHash: hashToken(sessionToken),
      expiresAt: new Date(exp),
    },
  });

  return { userPublicId: user.publicId, sessionToken, sessionPublicId };
}
