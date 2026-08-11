import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes, listBlockingIssues, type QualityIssue } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

type Ctx = { params: Promise<{ artifactId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { artifactId } = await ctx.params;
    const body = (await request.json()) as {
      format?: "PDF" | "PPTX";
      force?: boolean;
    };
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

    // Reload project metadata so GENERATE_REPORT → QUALITY_REVIEW writes are visible
    const project = await prisma.project.findUnique({
      where: { id: artifact.projectId },
      select: { id: true, metadata: true },
    });
    const meta = (project?.metadata ?? artifact.project.metadata ?? {}) as {
      qualityCheck?: { issues?: QualityIssue[] };
    };
    const blocking = listBlockingIssues({
      issues: meta.qualityCheck?.issues ?? [],
    });
    if (blocking.length && !body.force) {
      return jsonErr(
        ErrorCodes.QUALITY_WARNING,
        "存在未处理的质量问题，确认后可强制导出",
        409,
        false,
        { issues: blocking },
      );
    }
    if (blocking.length && body.force) {
      await prisma.projectDecision.create({
        data: {
          publicId: newPublicId(),
          projectId: artifact.projectId,
          nodeCode: "EXPORT",
          action: "FORCE_EXPORT",
          payload: { issueIds: blocking.map((b) => b.id), format },
        },
      });
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
