import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ artifactId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { artifactId } = await ctx.params;
    const body = (await request.json()) as { format?: "PDF" | "PPTX" };
    const format = body.format ?? "PDF";

    const artifact = await prisma.artifact.findUnique({
      where: { publicId: artifactId },
      include: { project: true },
    });
    if (!artifact || artifact.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "成果不存在", 404);
    }

    const neededType = format === "PPTX" ? "PPT_EXPORT" : "REPORT_EXPORT";
    const entitlement = await prisma.entitlement.findFirst({
      where: {
        userId: user.id,
        projectId: artifact.projectId,
        type: neededType,
        remaining: { gt: 0 },
      },
    });
    if (!entitlement) {
      return jsonErr(
        ErrorCodes.ENTITLEMENT_REQUIRED,
        format === "PPTX" ? "需要专业项目权益才能导出 PPT" : "需要付费后才能导出",
        402,
      );
    }

    const exp = await prisma.export.create({
      data: {
        publicId: newPublicId(),
        artifactId: artifact.id,
        format,
        status: "PENDING",
      },
    });

    await prisma.outboxEvent.create({
      data: {
        topic: "export",
        status: "PENDING",
        payload: {
          type: "EXPORT_FILE",
          exportPublicId: exp.publicId,
          artifactPublicId: artifact.publicId,
          projectPublicId: artifact.project.publicId,
          format,
          schemaVersion: 1,
        },
      },
    });

    return jsonOk({
      exportPublicId: exp.publicId,
      status: exp.status,
      format,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
