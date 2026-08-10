import { ErrorCodes, type NodeCode } from "@stepdone/domain";
import { EngineError } from "@stepdone/project-engine";
import { prisma } from "@stepdone/database";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { enqueueNode } from "@/lib/steps";

type Ctx = { params: Promise<{ projectId: string; stepCode: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId, stepCode } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const latest = await prisma.projectStepRun.findFirst({
      where: { projectId: project.id, nodeCode: stepCode },
      orderBy: { createdAt: "desc" },
    });
    if (!latest || latest.status !== "FAILED_RETRYABLE") {
      return jsonErr(
        ErrorCodes.AGENT_NOT_RETRYABLE,
        "当前步骤不可重试",
        400,
      );
    }

    const result = await enqueueNode({
      projectId: project.id,
      projectPublicId: project.publicId,
      userId: user.id,
      nodeCode: stepCode as NodeCode,
      input: latest.input,
      inputVersion: latest.inputVersion + 1,
    });

    return jsonOk({ agentRunId: result.agentRun.publicId });
  } catch (error) {
    if (error instanceof EngineError) {
      return jsonErr(error.code, error.message, 400);
    }
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
