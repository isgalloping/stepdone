import { prisma, newPublicId } from "@stepdone/database";
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
    const sources = await prisma.source.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({
      sources: sources.map((s) => ({
        publicId: s.publicId,
        title: s.title,
        publisher: s.publisher,
        url: s.url,
        credibility: s.credibility,
        status: s.status,
        excluded: s.excluded,
        summary: s.summary,
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const body = (await request.json()) as {
      title: string;
      url?: string;
      publisher?: string;
      summary?: string;
    };
    if (!body.title) return jsonErr("VALIDATION_ERROR", "title required", 400);
    const source = await prisma.source.create({
      data: {
        publicId: newPublicId(),
        projectId: project.id,
        title: body.title,
        url: body.url,
        publisher: body.publisher,
        summary: body.summary,
        credibility: "UNKNOWN",
        status: "PENDING",
      },
    });
    return jsonOk({ publicId: source.publicId });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
