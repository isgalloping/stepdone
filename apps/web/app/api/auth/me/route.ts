import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    return jsonOk({
      publicId: user.publicId,
      displayName: user.displayName,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(
      err.code ?? "AUTH_REQUIRED",
      "未登录",
      err.status ?? 401,
    );
  }
}
