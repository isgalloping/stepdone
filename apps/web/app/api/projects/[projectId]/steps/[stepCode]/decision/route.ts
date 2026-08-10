import { ErrorCodes, type NodeCode } from "@stepdone/domain";
import { EngineError } from "@stepdone/project-engine";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { recordDecision } from "@/lib/steps";

type Ctx = { params: Promise<{ projectId: string; stepCode: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId, stepCode } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const body = (await request.json()) as {
      action?: string;
      payload?: unknown;
    };
    if (!body.action) {
      return jsonErr("VALIDATION_ERROR", "action required", 400);
    }

    await recordDecision({
      projectId: project.id,
      projectPublicId: project.publicId,
      userId: user.id,
      nodeCode: stepCode as NodeCode,
      action: body.action,
      payload: body.payload,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof EngineError) {
      return jsonErr(error.code, error.message, 400);
    }
    const err = error as { code?: string; status?: number; message?: string };
    if (err.code === "AUTH_REQUIRED") {
      return jsonErr("AUTH_REQUIRED", "未登录", 401);
    }
    console.error(error);
    return jsonErr(
      "STEP_INVALID_TRANSITION",
      err.message ?? "decision failed",
      400,
    );
  }
}
