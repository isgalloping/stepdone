import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import {
  getOwnedProject,
  userHasPaidEntitlement,
  userHasEntitlement,
} from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

const FORMAT_ENTITLEMENT: Record<string, string> = {
  PDF: "REPORT_EXPORT",
  PPTX: "PPT_EXPORT",
};

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const exports = await prisma.export.findMany({
      where: { artifact: { projectId: project.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return jsonOk({
      exports: exports.map((e) => ({
        publicId: e.publicId,
        format: e.format,
        status: e.status,
        downloadUrl: e.status === "COMPLETED" ? e.storageKey : null,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const body = (await request.json().catch(() => ({}))) as {
      format?: string;
    };
    const format = (body.format ?? "PDF").toUpperCase();
    if (!FORMAT_ENTITLEMENT[format]) {
      return jsonErr("EXPORT_FORMAT_UNSUPPORTED", "不支持的导出格式", 400);
    }

    // Must be paid, and hold the format-specific entitlement (PPTX = 专业).
    const paid = await userHasPaidEntitlement(user.id, project.id);
    if (!paid) {
      return jsonErr(ErrorCodes.ENTITLEMENT_REQUIRED, "请先完成付费解锁完整成果", 402);
    }
    const canExport = await userHasEntitlement(
      user.id,
      project.id,
      FORMAT_ENTITLEMENT[format],
    );
    if (!canExport) {
      return jsonErr(
        ErrorCodes.ENTITLEMENT_REQUIRED,
        format === "PPTX" ? "PPT 导出需要专业项目权益" : "缺少导出权益",
        402,
      );
    }

    const artifact = await prisma.artifact.findFirst({
      where: { projectId: project.id, type: "ONLINE_REPORT" },
      orderBy: { createdAt: "desc" },
    });
    if (!artifact) {
      return jsonErr("ARTIFACT_NOT_READY", "完整报告尚未生成", 409);
    }

    // Create the export record and enqueue via Outbox (same as real pipeline).
    const created = await prisma.$transaction(async (tx) => {
      const exportRow = await tx.export.create({
        data: {
          publicId: newPublicId(),
          artifactId: artifact.id,
          format,
          status: "PENDING",
        },
      });
      await tx.outboxEvent.create({
        data: {
          topic: "export",
          status: "PENDING",
          payload: {
            type: "EXPORT_ARTIFACT",
            exportPublicId: exportRow.publicId,
            projectPublicId: project.publicId,
            format,
          },
        },
      });
      return exportRow;
    });

    return jsonOk({
      publicId: created.publicId,
      format: created.format,
      status: created.status,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number; message?: string };
    if (err.code === "AUTH_REQUIRED") {
      return jsonErr("AUTH_REQUIRED", "未登录", 401);
    }
    console.error(error);
    return jsonErr("EXPORT_ERROR", err.message ?? "export failed", 400);
  }
}
