import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ exportId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { exportId } = await ctx.params;
    const exp = await prisma.export.findUnique({
      where: { publicId: exportId },
      include: { artifact: { include: { project: true } } },
    });
    if (!exp || exp.artifact.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "导出不存在", 404);
    }

    return jsonOk({
      exportPublicId: exp.publicId,
      format: exp.format,
      status: exp.status,
      downloadUrl:
        exp.status === "COMPLETED"
          ? exp.storageKey ??
            (exp.format === "PPTX"
              ? "/samples/sample-deck.pptx"
              : "/samples/sample-report.pdf")
          : null,
      errorMessage: exp.errorMessage,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
