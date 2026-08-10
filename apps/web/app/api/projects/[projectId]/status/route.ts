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

    const latestEvent = await prisma.projectEvent.findFirst({
      where: { projectId: project.id },
      orderBy: { id: "desc" },
    });

    const activeRun = await prisma.agentRun.findFirst({
      where: {
        projectId: project.id,
        status: { in: ["QUEUED", "RUNNING"] },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({
      status: project.status,
      currentStepCode: project.currentStepCode,
      progress: project.progress,
      revision: project.revision,
      activeAgentRun: activeRun
        ? { publicId: activeRun.publicId, nodeCode: activeRun.nodeCode, status: activeRun.status }
        : null,
      latestEvent: latestEvent
        ? {
            publicId: latestEvent.publicId,
            type: latestEvent.type,
            stage: latestEvent.stage,
            message: latestEvent.message,
            percent: latestEvent.percent,
            createdAt: latestEvent.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
