import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { sourceId } = await ctx.params;
    const source = await prisma.source.findUnique({
      where: { publicId: sourceId },
      include: { project: true },
    });
    if (!source || source.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "来源不存在", 404);
    }
    const body = (await request.json()) as { excluded?: boolean; status?: string };
    const updated = await prisma.source.update({
      where: { id: source.id },
      data: {
        excluded: body.excluded ?? source.excluded,
        status: body.status ?? source.status,
      },
    });
    return jsonOk({
      publicId: updated.publicId,
      excluded: updated.excluded,
      status: updated.status,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
