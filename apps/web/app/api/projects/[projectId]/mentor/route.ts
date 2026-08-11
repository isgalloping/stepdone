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

export async function GET(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const step = new URL(request.url).searchParams.get("step") ?? "";
    if (!isMentorStepKey(step)) {
      return jsonErr("VALIDATION_ERROR", "invalid step", 400);
    }

    const answeredIds = await answeredQuestionIds(project.id, step);
    const index = nextMentorIndex(answeredIds, step);
    const script = getMentorScript(step);
    const done = index < 0;
    const question = done ? null : (script[index] ?? null);

    return jsonOk({
      step,
      index,
      done,
      question,
      answeredIds,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
