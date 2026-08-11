import { mockLogin } from "@stepdone/auth";
import { prisma } from "@stepdone/database";
import { jsonOk, jsonErr } from "@/lib/api";
import { SESSION_COOKIE, cookieOptions } from "@/lib/session";

export async function POST() {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return jsonErr("SYSTEM_ERROR", "SESSION_SECRET missing", 500);

    const result = await mockLogin(prisma, secret);
    const response = jsonOk({
      user: {
        publicId: result.userPublicId,
        displayName: "演示用户",
      },
    });
    response.cookies.set(
      SESSION_COOKIE,
      result.sessionToken,
      cookieOptions(7 * 24 * 60 * 60),
    );
    return response;
  } catch (error) {
    console.error(error);
    return jsonErr("SYSTEM_ERROR", "mock login failed", 500);
  }
}
