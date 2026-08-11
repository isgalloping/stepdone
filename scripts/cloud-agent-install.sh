#!/usr/bin/env bash
# Idempotent repository bootstrap for Cloud Agent environments.
# Installs the system prerequisites (Docker engine + compose + fuse-overlayfs)
# and refreshes workspace dependencies after checkout. Self-contained so it
# works from the default base image without relying on a prebuilt snapshot.
set -euo pipefail

cd "$(dirname "$0")/.."

# --- System packages: Docker engine + compose plugin + fuse-overlayfs -------
# Cloud Agent VMs have no systemd; the daemon itself is started in the start
# script. fuse-overlayfs avoids the nested-overlay mount failures produced by
# the default containerd snapshotter inside the VM.
if ! command -v dockerd >/dev/null 2>&1 || ! command -v fuse-overlayfs >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker.io docker-compose-v2 fuse-overlayfs
fi

sudo mkdir -p /etc/docker
printf '%s\n' \
  '{' \
  '  "features": { "containerd-snapshotter": false },' \
  '  "storage-driver": "fuse-overlayfs"' \
  '}' | sudo tee /etc/docker/daemon.json >/dev/null

# Let the non-root user reach the Docker socket without sudo (repo scripts use
# plain `docker`). Group membership becomes effective on the next login; the
# start script also chmods the socket so it works on the very first boot too.
sudo groupadd -f docker
sudo usermod -aG docker "$(id -un)" || true

# --- Local dev parity: the app reads DATABASE_URL/REDIS_URL/... from .env ----
if [ ! -f .env ]; then
  cp .env.example .env
fi

# --- Workspace dependencies -------------------------------------------------
corepack enable
pnpm install --frozen-lockfile

# @prisma/client postinstall does not auto-generate; do it explicitly.
pnpm --filter @stepdone/database exec prisma generate

# Browser used by the Playwright e2e suite (no-op when already cached).
pnpm exec playwright install chromium

echo "cloud-agent-install: done"
