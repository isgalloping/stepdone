import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

// Archive / unarchive. Archive state is tracked via archivedAt so the project's
// workflow status is preserved and it can be resumed after unarchiving.
export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const body = (await request.json().catch(() => ({}))) as {
      archived?: boolean;
    };
    const archived = body.archived ?? true;
    await prisma.project.update({
      where: { id: project.id },
      data: { archivedAt: archived ? new Date() : null },
    });
    return jsonOk({ publicId: project.publicId, archived });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
