import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { getTemplateV1 } from "@stepdone/project-engine";
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

    const runs = await prisma.projectStepRun.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });

    const template = getTemplateV1();
    return jsonOk({
      templateSteps: template.steps,
      runs: runs.map((r) => ({
        publicId: r.publicId,
        nodeCode: r.nodeCode,
        status: r.status,
        output: r.output,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
