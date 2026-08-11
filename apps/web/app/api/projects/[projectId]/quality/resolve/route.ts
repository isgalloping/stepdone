import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

type Issue = {
  id: string;
  severity: string;
  dimension?: string;
  message: string;
  status: string;
  resolution?: string;
};

const ACTIONS = new Set([
  "ADD_SOURCE",
  "SOFTEN_WORDING",
  "REMOVE_CONCLUSION",
  "KEEP_WITH_RISK",
]);

// Persist quality-issue resolution into the QUALITY_REVIEW step output so it
// survives reloads (P11). Resolving an issue records the chosen action.
export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const body = (await request.json().catch(() => ({}))) as {
      issueId?: string;
      action?: string;
    };
    if (!body.issueId || !body.action || !ACTIONS.has(body.action)) {
      return jsonErr("VALIDATION_ERROR", "issueId 与合法 action 必填", 400);
    }

    const run = await prisma.projectStepRun.findFirst({
      where: { projectId: project.id, nodeCode: "QUALITY_REVIEW" },
      orderBy: { createdAt: "desc" },
    });
    if (!run) {
      return jsonErr("ARTIFACT_NOT_READY", "质量报告尚未生成", 409);
    }

    const output = (run.output ?? {}) as {
      scores?: Record<string, number>;
      issues?: Issue[];
    };
    const issues = output.issues ?? [];
    const idx = issues.findIndex((i) => i.id === body.issueId);
    if (idx === -1) {
      return jsonErr("QUALITY_ISSUE_NOT_FOUND", "问题不存在", 404);
    }
    issues[idx] = {
      ...issues[idx],
      status: "RESOLVED",
      resolution: body.action,
    };

    await prisma.projectStepRun.update({
      where: { id: run.id },
      data: { output: { ...output, issues } },
    });

    const openHigh = issues.some(
      (i) => i.status !== "RESOLVED" && i.severity === "HIGH",
    );
    return jsonOk({ issues, deliverable: !openHigh });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
