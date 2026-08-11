import {
  ErrorCodes,
  assertMentorIntent,
  isMentorAskStep,
  mentorReply,
} from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

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
      intent?: string;
      selection?: string;
      step?: string;
    };

    if (!body.step || !isMentorAskStep(body.step)) {
      return jsonErr(
        "VALIDATION_ERROR",
        "ask only allowed on decisions/report",
        400,
      );
    }
    if (!body.intent) {
      return jsonErr("VALIDATION_ERROR", "intent required", 400);
    }

    try {
      assertMentorIntent(body.intent);
    } catch {
      return jsonErr("VALIDATION_ERROR", "invalid intent", 400);
    }

    const suggestion = mentorReply(body.intent, body.selection ?? "");
    return jsonOk({ suggestion });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
