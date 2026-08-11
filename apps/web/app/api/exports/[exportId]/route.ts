import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ exportId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { exportId } = await ctx.params;
    const exportRow = await prisma.export.findUnique({
      where: { publicId: exportId },
      include: { artifact: { include: { project: true } } },
    });
    if (!exportRow || exportRow.artifact.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "导出记录不存在", 404);
    }
    return jsonOk({
      publicId: exportRow.publicId,
      format: exportRow.format,
      status: exportRow.status,
      // Short-lived signed URL is simulated by a controlled static path.
      downloadUrl: exportRow.status === "COMPLETED" ? exportRow.storageKey : null,
      completedAt: exportRow.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
