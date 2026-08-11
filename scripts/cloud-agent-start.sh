#!/usr/bin/env bash
# Per-boot reconciliation for Cloud Agent environments.
# Starts the Docker daemon (no systemd in the VM), brings up MySQL + Redis,
# then applies migrations and seeds. Safe to run repeatedly.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE_FILE="infrastructure/docker/docker-compose.yml"

# 1. Ensure the Docker daemon is running. fuse-overlayfs avoids the nested
#    overlay mount failures seen with the default containerd snapshotter.
#    Probe with `sudo docker` so readiness does not depend on the invoking
#    shell having picked up the `docker` group membership yet.
if ! sudo docker info >/dev/null 2>&1; then
  echo "cloud-agent-start: starting dockerd"
  # Remove stale pid/log first: a log left by a prior boot may be owned by
  # another user, which blocks re-creating it via redirection.
  sudo rm -f /var/run/docker.pid /tmp/dockerd.log 2>/dev/null || true
  sudo sh -c 'dockerd >/tmp/dockerd.log 2>&1 &'
  for _ in $(seq 1 30); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi
if ! sudo docker info >/dev/null 2>&1; then
  echo "cloud-agent-start: dockerd failed to start" >&2
  tail -n 40 /tmp/dockerd.log >&2 || true
  exit 1
fi

# Make the socket usable by the non-root user so the repo's plain `docker`
# commands (docker:up) and the terminals work without sudo.
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true

# 2. Bring up infrastructure and wait for health. Idempotent: reuses running
#    containers. A prebuilt snapshot can capture the MySQL data volume
#    mid-write, leaving InnoDB unable to finish crash recovery on restore; if
#    the DB does not come up healthy, recreate the (ephemeral, reseeded) volumes
#    once and retry.
compose_up_and_wait() {
  docker compose -f "$COMPOSE_FILE" up -d
  local mysql_health redis_health state
  for _ in $(seq 1 60); do
    mysql_health="$(docker inspect --format '{{.State.Health.Status}}' docker-mysql-1 2>/dev/null || echo none)"
    redis_health="$(docker inspect --format '{{.State.Health.Status}}' docker-redis-1 2>/dev/null || echo none)"
    if [ "$mysql_health" = "healthy" ] && [ "$redis_health" = "healthy" ]; then
      echo "cloud-agent-start: mysql=$mysql_health redis=$redis_health"
      return 0
    fi
    state="$(docker inspect --format '{{.State.Status}}' docker-mysql-1 2>/dev/null || echo none)"
    if [ "$state" = "exited" ] || [ "$state" = "dead" ]; then
      break
    fi
    sleep 2
  done
  echo "cloud-agent-start: mysql=$mysql_health redis=$redis_health (not healthy)"
  return 1
}

if ! compose_up_and_wait; then
  echo "cloud-agent-start: recreating infrastructure volumes and retrying"
  docker compose -f "$COMPOSE_FILE" down -v || true
  compose_up_and_wait || {
    echo "cloud-agent-start: infrastructure failed to become healthy" >&2
    docker compose -f "$COMPOSE_FILE" logs --tail 40 mysql >&2 || true
    exit 1
  }
fi

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
