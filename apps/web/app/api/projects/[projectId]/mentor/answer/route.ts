import { prisma, newPublicId } from "@stepdone/database";
import {
  ErrorCodes,
  getMentorScript,
  isMentorStepKey,
  nextMentorIndex,
} from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { answeredQuestionIds } from "@/lib/mentor/answered";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const body = (await request.json()) as {
      step?: string;
      questionId?: string;
      optionId?: string;
    };

    if (!body.step || !isMentorStepKey(body.step)) {
      return jsonErr("VALIDATION_ERROR", "invalid step", 400);
    }
    if (!body.questionId || !body.optionId) {
      return jsonErr("VALIDATION_ERROR", "questionId and optionId required", 400);
    }

    const script = getMentorScript(body.step);
    const question = script.find((q) => q.id === body.questionId);
    if (!question) {
      return jsonErr("VALIDATION_ERROR", "unknown questionId", 400);
    }
    if (!question.options.some((o) => o.id === body.optionId)) {
      return jsonErr("VALIDATION_ERROR", "unknown optionId", 400);
    }

    await prisma.projectDecision.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        nodeCode: body.step,
        action: "MENTOR_ANSWER",
        payload: {
          step: body.step,
          questionId: body.questionId,
          optionId: body.optionId,
        },
      },
    });

    const answeredIds = await answeredQuestionIds(project.id, body.step);
    const index = nextMentorIndex(answeredIds, body.step);
    const done = index < 0;
    const next = done ? null : (script[index] ?? null);

    return jsonOk({ next, done, index });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
