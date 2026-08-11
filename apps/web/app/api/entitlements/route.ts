import { prisma } from "@stepdone/database";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireUser();
    const entitlements = await prisma.entitlement.findMany({
      where: { userId: user.id, remaining: { gt: 0 } },
      orderBy: { createdAt: "desc" },
    });
    const projectIds = [
      ...new Set(
        entitlements
          .map((e) => e.projectId)
          .filter((id): id is bigint => id != null),
      ),
    ];
    const projects =
      projectIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, publicId: true },
          })
        : [];
    const publicIdByDbId = new Map(
      projects.map((p) => [p.id.toString(), p.publicId]),
    );
    return jsonOk({
      entitlements: entitlements.map((e) => ({
        publicId: e.publicId,
        type: e.type,
        remaining: e.remaining,
        projectId: e.projectId
          ? (publicIdByDbId.get(e.projectId.toString()) ?? null)
          : null,
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
