#!/usr/bin/env bash
# Idempotent repository bootstrap for Cloud Agent environments.
# Refreshes workspace dependencies and source-derived state after checkout.
# System packages (Docker, fuse-overlayfs, ...) live in the base snapshot/image.
set -euo pipefail

cd "$(dirname "$0")/.."

# Local dev parity: the app reads DATABASE_URL/REDIS_URL/... from this file.
if [ ! -f .env ]; then
  cp .env.example .env
fi

corepack enable
pnpm install --frozen-lockfile

# @prisma/client postinstall does not auto-generate; do it explicitly.
pnpm --filter @stepdone/database exec prisma generate

# Browser used by the Playwright e2e suite (no-op when already cached).
pnpm exec playwright install chromium

echo "cloud-agent-install: done"
