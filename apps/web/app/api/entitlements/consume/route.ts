import { ErrorCodes } from "@stepdone/domain";
import { consumeEntitlement } from "@stepdone/payments";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { enqueueNode } from "@/lib/steps";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      projectId?: string;
      type?: "RESEARCH_RETRY" | "REPORT_REGENERATE";
    };
    if (!body.projectId || !body.type) {
      return jsonErr("VALIDATION_ERROR", "projectId and type required", 400);
    }
    const project = await getOwnedProject(user.id, body.projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const consumed = await consumeEntitlement({
      userId: user.id,
      projectId: project.id,
      type: body.type,
      reason: body.type,
    });
    const nodeCode =
      body.type === "RESEARCH_RETRY" ? "RESEARCH_SOURCES" : "GENERATE_REPORT";
    const latest = await (await import("@stepdone/database")).prisma.projectStepRun.findFirst({
      where: { projectId: project.id, nodeCode },
      orderBy: { createdAt: "desc" },
    });
    const result = await enqueueNode({
      projectId: project.id,
      projectPublicId: project.publicId,
      userId: user.id,
      nodeCode,
      inputVersion: (latest?.inputVersion ?? 1) + 1,
    });
    return jsonOk({
      remaining: consumed.remaining,
      agentRunId: result.agentRun.publicId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "consume failed";
    if (message.includes("ENTITLEMENT_REQUIRED")) {
      return jsonErr(ErrorCodes.ENTITLEMENT_REQUIRED, "权益不足或需要专业版", 402);
    }
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
