import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    return jsonOk({
      publicId: project.publicId,
      title: project.title,
      status: project.status,
      currentStepCode: project.currentStepCode,
      progress: project.progress,
      revision: project.revision,
      metadata: project.metadata,
      updatedAt: project.updatedAt.toISOString(),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const body = (await request.json()) as {
      revision: number;
      changes?: Record<string, unknown>;
    };
    if (typeof body.revision !== "number") {
      return jsonErr("VALIDATION_ERROR", "revision required", 400);
    }

    const data: Record<string, unknown> = { revision: { increment: 1 } };
    if (body.changes?.title) data.title = body.changes.title;
    if (body.changes?.metadata) data.metadata = body.changes.metadata;
    if (body.changes?.objective) data.objective = body.changes.objective;

    const updated = await prisma.project.updateMany({
      where: { id: project.id, revision: body.revision },
      data,
    });

    if (updated.count === 0) {
      return jsonErr(
        ErrorCodes.PROJECT_REVISION_CONFLICT,
        "检测到版本冲突",
        409,
      );
    }

    const fresh = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    return jsonOk({
      publicId: fresh.publicId,
      revision: fresh.revision,
      updatedAt: fresh.updatedAt.toISOString(),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

/** Soft delete: keep the row for 30 days (回收站) so it can be restored. */
export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    await prisma.project.update({
      where: { id: project.id },
      data: { deletedAt: new Date() },
    });
    return jsonOk({ publicId: project.publicId, deleted: true });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
