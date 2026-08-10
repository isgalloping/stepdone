import http from "node:http";
import { prisma } from "@stepdone/database";
import IORedis from "ioredis";

export function startHealthServer(port = 4101) {
  const server = http.createServer(async (req, res) => {
    if (req.url === "/health/live") {
      res.writeHead(200);
      res.end("ok");
      return;
    }
    if (req.url === "/health/ready") {
      try {
        await prisma.$queryRaw`SELECT 1`;
        const redis = new IORedis(
          process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        );
        await redis.ping();
        await redis.quit();
        res.writeHead(200);
        res.end("ready");
      } catch (error) {
        res.writeHead(503);
        res.end(String(error));
      }
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`health server on 127.0.0.1:${port}`);
  });
  return server;
}
