import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { userHasPaidEntitlement } from "@/lib/projects";

type Ctx = { params: Promise<{ artifactId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { artifactId } = await ctx.params;
    const artifact = await prisma.artifact.findUnique({
      where: { publicId: artifactId },
      include: {
        project: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
        _count: { select: { versions: true } },
      },
    });
    if (!artifact || artifact.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "成果不存在", 404);
    }
    const paid = await userHasPaidEntitlement(user.id, artifact.projectId);
    if (artifact.type === "ONLINE_REPORT" && !paid) {
      return jsonErr(ErrorCodes.ENTITLEMENT_REQUIRED, "需要付费解锁", 402);
    }
    return jsonOk({
      publicId: artifact.publicId,
      type: artifact.type,
      title: artifact.title,
      content: artifact.versions[0]?.content ?? null,
      version: artifact.versions[0]?.version ?? 0,
      versionsCount: artifact._count.versions,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { artifactId } = await ctx.params;
    const artifact = await prisma.artifact.findUnique({
      where: { publicId: artifactId },
      include: {
        project: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!artifact || artifact.project.userId !== user.id) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "成果不存在", 404);
    }
    const paid = await userHasPaidEntitlement(user.id, artifact.projectId);
    if (!paid) {
      return jsonErr(ErrorCodes.ENTITLEMENT_REQUIRED, "需要付费解锁", 402);
    }

    const body = (await request.json()) as {
      title?: string;
      content?: unknown;
      expectedVersion?: number;
    };

    const latestVersion = artifact.versions[0]?.version ?? 0;
    if (
      body.expectedVersion !== undefined &&
      body.expectedVersion !== latestVersion
    ) {
      return jsonErr(
        ErrorCodes.ARTIFACT_VERSION_CONFLICT,
        "成果版本已变更，请刷新后重试",
        409,
      );
    }

    if (body.title) {
      await prisma.artifact.update({
        where: { id: artifact.id },
        data: { title: body.title },
      });
    }

    let version = latestVersion;
    if (body.content !== undefined) {
      version += 1;
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

    return jsonOk({ publicId: artifact.publicId, version });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
