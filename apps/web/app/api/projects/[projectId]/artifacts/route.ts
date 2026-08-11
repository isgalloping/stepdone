import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject, userHasPaidEntitlement } from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }

    const paid = await userHasPaidEntitlement(user.id, project.id);
    const artifacts = await prisma.artifact.findMany({
      where: { projectId: project.id },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    return jsonOk({
      paid,
      artifacts: artifacts.map((a) => ({
        publicId: a.publicId,
        type: a.type,
        title: a.title,
        status: a.status,
        // Hide full report content when unpaid
        content:
          a.type === "ONLINE_REPORT" && !paid
            ? null
            : (a.versions[0]?.content ?? null),
        previewOnly: a.type === "ONLINE_REPORT" && !paid,
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
