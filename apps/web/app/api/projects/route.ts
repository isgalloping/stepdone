import { prisma } from "@stepdone/database";
import { ObjectiveInputSchema } from "@stepdone/schemas";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { createProjectFromObjective } from "@/lib/projects";

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return jsonOk({
      projects: projects.map((p) => ({
        publicId: p.publicId,
        title: p.title,
        status: p.status,
        currentStepCode: p.currentStepCode,
        progress: p.progress,
        revision: p.revision,
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = ObjectiveInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonErr("VALIDATION_ERROR", parsed.error.message, 400);
    }
    const project = await createProjectFromObjective(user.id, parsed.data);
    return jsonOk({
      projectId: project.publicId,
      status: project.status,
      currentStepCode: project.currentStepCode,
      revision: project.revision,
    });
  } catch (error) {
    const err = error as { code?: string; status?: number; message?: string };
    if (err.code === "AUTH_REQUIRED") {
      return jsonErr("AUTH_REQUIRED", "未登录", 401);
    }
    console.error(error);
    return jsonErr("SYSTEM_ERROR", err.message ?? "create failed", 500);
  }
}
