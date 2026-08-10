import { prisma } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";
import { getOwnedProject } from "@/lib/projects";
import { requireUser } from "@/lib/session";
import { getRedis, projectChannel } from "@/lib/redis";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const project = await getOwnedProject(user.id, projectId);
    if (!project) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: ErrorCodes.PROJECT_NOT_FOUND, message: "not found" },
        }),
        { status: 404 },
      );
    }

    const encoder = new TextEncoder();
    const redis = getRedis();
    const sub = redis.duplicate();
    const channel = projectChannel(project.publicId);

    const stream = new ReadableStream({
      start(controller) {
        const send = (data: object, id?: string) => {
          if (id) controller.enqueue(encoder.encode(`id: ${id}\n`));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );
        };

        send({ type: "CONNECTED", projectId: project.publicId });

        const onMessage = (_ch: string, message: string) => {
          try {
            const parsed = JSON.parse(message) as { id?: string } & object;
            send(parsed, parsed.id);
          } catch {
            send({ type: "PROGRESS", message });
          }
        };

        void sub.subscribe(channel).then(() => {
          sub.on("message", onMessage);
        });

        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        }, 15_000);

        const abort = () => {
          clearInterval(heartbeat);
          sub.off("message", onMessage);
          void sub.unsubscribe(channel);
          void sub.quit();
          try {
            controller.close();
          } catch {
            /* closed */
          }
        };

        request.signal.addEventListener("abort", abort);
      },
    });

    // touch prisma so ownership path is hot
    void prisma.projectEvent.count({ where: { projectId: project.id } });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}
