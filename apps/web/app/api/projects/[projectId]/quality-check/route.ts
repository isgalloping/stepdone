import { prisma } from "@stepdone/database";
import {
  ErrorCodes,
  markIssueResolved,
  type QualityCheckState,
  type QualityIssue,
} from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

type QualityCheckMeta = {
  scores?: Record<string, number>;
  issues?: QualityIssue[];
};

function readQualityCheck(metadata: unknown): QualityCheckMeta {
  const meta = (metadata ?? {}) as { qualityCheck?: QualityCheckMeta };
  return {
    scores: meta.qualityCheck?.scores ?? {},
    issues: meta.qualityCheck?.issues ?? [],
  };
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const quality = readQualityCheck(project.metadata);
    return jsonOk({
      scores: quality.scores ?? {},
      issues: quality.issues ?? [],
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
      issueId?: string;
      status?: "RESOLVED";
    };
    if (!body.issueId || body.status !== "RESOLVED") {
      return jsonErr("VALIDATION_ERROR", "issueId and status=RESOLVED required", 400);
    }

    const prev = (project.metadata ?? {}) as Record<string, unknown>;
    const quality = readQualityCheck(project.metadata);
    const state: QualityCheckState = { issues: quality.issues ?? [] };
    if (!state.issues.some((i) => i.id === body.issueId)) {
      return jsonErr("VALIDATION_ERROR", "issue not found", 404);
    }
    const next = markIssueResolved(state, body.issueId);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        metadata: {
          ...prev,
          qualityCheck: {
            scores: quality.scores ?? {},
            issues: next.issues,
          },
        },
      },
    });

    return jsonOk({
      scores: quality.scores ?? {},
      issues: next.issues,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
