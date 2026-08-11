#!/usr/bin/env bash
# Per-boot reconciliation for Cloud Agent environments.
# Starts the Docker daemon (no systemd in the VM), brings up MySQL + Redis,
# then applies migrations and seeds. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="infrastructure/docker/docker-compose.yml"

# 1. Ensure the Docker daemon is running. fuse-overlayfs avoids the nested
#    overlay mount failures seen with the default containerd snapshotter.
if ! docker info >/dev/null 2>&1; then
  echo "cloud-agent-start: starting dockerd"
  sudo rm -f /var/run/docker.pid 2>/dev/null || true
  sudo sh -c 'dockerd >/tmp/dockerd.log 2>&1 &'
  for _ in $(seq 1 30); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi
if ! docker info >/dev/null 2>&1; then
  echo "cloud-agent-start: dockerd failed to start" >&2
  tail -n 40 /tmp/dockerd.log >&2 || true
  exit 1
fi

# 2. Bring up infrastructure (idempotent; reuses running containers).
docker compose -f "$COMPOSE_FILE" up -d

# 3. Wait for both services to report healthy.
for _ in $(seq 1 60); do
  mysql_health="$(docker inspect --format '{{.State.Health.Status}}' docker-mysql-1 2>/dev/null || echo none)"
  redis_health="$(docker inspect --format '{{.State.Health.Status}}' docker-redis-1 2>/dev/null || echo none)"
  if [ "$mysql_health" = "healthy" ] && [ "$redis_health" = "healthy" ]; then
    break
  fi
  sleep 2
done
echo "cloud-agent-start: mysql=$mysql_health redis=$redis_health"

# 4. Grant the app user database-level privileges so the documented
#    `pnpm db:migrate` (prisma migrate dev + shadow database) also works.
docker exec docker-mysql-1 mysql -uroot -proot \
  -e "GRANT ALL PRIVILEGES ON *.* TO 'stepdone'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;" \
  >/dev/null 2>&1 || true

# 5. Apply migrations + seed reference data (both idempotent).
set -a
# shellcheck disable=SC1091
. ./.env
set +a
pnpm --filter @stepdone/database exec prisma migrate deploy
pnpm db:seed

echo "cloud-agent-start: ready"
