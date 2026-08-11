# M1 Slice Polish Checklist

## Features

- [x] citations drawer
- [x] PRO consume research/report
- [x] quality soft gate + force
- [x] report version on adopt
- [x] mentor scripts + ask
- [x] add URL + custom competitor
- [x] ability real counts
- [x] smoke + e2e green

## Local verification commands

```bash
# infra
docker compose -f infrastructure/docker/docker-compose.yml up -d
# apps (load env first)
set -a && source .env && set +a
pnpm --filter @stepdone/web dev
pnpm --filter @stepdone/agent-worker dev

# unit / package tests
pnpm --filter @stepdone/domain test
pnpm --filter @stepdone/payments test
pnpm --filter @stepdone/agent-worker test

# smoke + e2e (web :3000, worker :4101/health/live)
node scripts/smoke-main-path.mjs
pnpm test:e2e
```

Expected: all PASS / `SMOKE_PASS`.
