import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const citations = await prisma.citation.findMany({
      where: { source: { projectId: project.id } },
      include: { source: true },
      orderBy: { createdAt: "asc" },
    });
    return jsonOk({
      citations: citations.map((c) => ({
        publicId: c.publicId,
        quote: c.quote,
        source: {
          publicId: c.source.publicId,
          title: c.source.title,
          publisher: c.source.publisher,
          url: c.source.url,
          credibility: c.source.credibility,
          summary: c.source.summary,
        },
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
