import { ErrorCodes, type NodeCode } from "@stepdone/domain";
import { EngineError } from "@stepdone/project-engine";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { enqueueNode } from "@/lib/steps";

type Ctx = { params: Promise<{ projectId: string; stepCode: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId, stepCode } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      input = undefined;
    }

    const result = await enqueueNode({
      projectId: project.id,
      projectPublicId: project.publicId,
      userId: user.id,
      nodeCode: stepCode as NodeCode,
      input,
    });

    return jsonOk({
      agentRunId: result.agentRun.publicId,
      deduped: result.deduped,
    });
  } catch (error) {
    if (error instanceof EngineError) {
      const status =
        error.code === ErrorCodes.ENTITLEMENT_REQUIRED ? 402 : 400;
      return jsonErr(error.code, error.message, status);
    }
    const err = error as { code?: string; status?: number; message?: string };
    if (err.code === "AUTH_REQUIRED") {
      return jsonErr("AUTH_REQUIRED", "未登录", 401);
    }
    console.error(error);
    return jsonErr("SYSTEM_ERROR", err.message ?? "start failed", 500);
  }
}
