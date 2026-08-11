import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { userHasPaidEntitlement } from "@/lib/projects";

type Ctx = { params: Promise<{ artifactId: string }> };

// Autosave the report editor (§32). Maintains a single working USER version
// (created as V(next) the first time a user edits, updated in place afterwards),
// keeping the AI-generated version(s) immutable per §28.
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { artifactId } = await ctx.params;
    const artifact = await prisma.artifact.findUnique({
      where: { publicId: artifactId },
      include: {
        project: true,
        versions: { orderBy: { version: "desc" } },
      },
    });
    if (!artifact || artifact.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "成果不存在或无权访问", 404);
    }
    const paid = await userHasPaidEntitlement(user.id, artifact.projectId);
    if (!paid) {
      return jsonErr(ErrorCodes.ENTITLEMENT_REQUIRED, "请先付费解锁完整成果", 402);
    }

    const body = (await request.json().catch(() => ({}))) as {
      content?: unknown;
    };
    if (!body.content) {
      return jsonErr("VALIDATION_ERROR", "content required", 400);
    }

    const latest = artifact.versions[0];
    const workingUser = artifact.versions.find((v) => v.createdBy === "USER");

    let version: number;
    if (workingUser) {
      await prisma.artifactVersion.update({
        where: { id: workingUser.id },
        data: { content: body.content as object },
      });
      version = workingUser.version;
    } else {
      version = (latest?.version ?? 0) + 1;
      await prisma.artifactVersion.create({
        data: {
          publicId: newPublicId(),
          artifactId: artifact.id,
          version,
          content: body.content as object,
          createdBy: "USER",
        },
      });
    }

    await prisma.artifact.update({
      where: { id: artifact.id },
      data: { updatedAt: new Date() },
    });

    return jsonOk({ version, savedAt: new Date().toISOString() });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
