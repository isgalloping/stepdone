# StepDone AI（逐成 AI）

一步一步，把事情做成。 / Step by step. Get it done.

本仓库当前实现 **0.0.1 可演示垂直切片** 的 Slice A：monorepo、MySQL/Redis、假 Agent Worker、mock 登录/支付闸门与主链路 API。

## 本地启动

前置：Node.js 20+、Docker Desktop、pnpm 9（`corepack enable`）。

```bash
# 1. 依赖
pnpm install

# 2. 环境变量
cp .env.example .env

# 3. 基础设施
pnpm docker:up

# 4. 数据库
pnpm db:migrate
pnpm db:seed

# 5. 启动 Web + Worker（两个终端）
pnpm --filter @stepdone/web dev
pnpm --filter @stepdone/agent-worker dev
```

- Web: http://localhost:3000  
- Worker health: http://127.0.0.1:4101/health/live  

## API Smoke

```bash
node scripts/smoke-main-path.mjs
```

期望输出包含 `PAYMENT_OK`、`REPORT_NODE_OK`、`SMOKE_PASS`。

## UI E2E

```bash
pnpm test:e2e
```

覆盖：首页 → 填表 → mock 登录恢复 → 六步 → 付费 → 报告导出。

## 关键路径

| 能力 | 路径 |
|---|---|
| Mock 登录 | `POST /api/auth/mock-login` |
| 创建项目 | `POST /api/projects` |
| 步骤决策 | `POST /api/projects/:id/steps/:code/decision` |
| 状态轮询 | `GET /api/projects/:id/status` |
| SSE | `GET /api/projects/:id/events` |
| Mock 支付 | `POST /api/orders` → `POST /api/payments/mock/confirm` |

## 文档

- 设计规格：`docs/superpowers/specs/2026-08-10-stepdone-0.0.1-vertical-slice-design.md`
- 实现计划 A：`docs/superpowers/plans/2026-08-10-stepdone-0.0.1-slice-a-foundation.md`
- 实现计划 B（UI）：`docs/superpowers/plans/2026-08-10-stepdone-0.0.1-slice-b-ui-e2e.md`

## 说明

- `MOCK_PAYMENTS=1` 时允许 mock 支付确认；生产环境勿开启。
- AI / 搜索 / 微信均为 mock；状态机、订单权益、Outbox/队列为真实边界。
