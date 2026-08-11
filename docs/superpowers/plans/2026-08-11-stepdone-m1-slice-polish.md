# StepDone M1 Slice Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在已可演示的垂直切片上完成 M1「切片体验闭环」：引用可见、专业权益可扣、质量软闸门、建议→采用→版本、导师脚本+受限提问、资料 URL/自定义竞品、能力真实计数，并用单测/E2E 锁住。

**Architecture:** 不新建服务。增量落在 `apps/web` BFF + UI、`apps/agent-worker` fixture、`packages/payments` 权益消费、`packages/domain` 错误码。质量 issues 以项目 `metadata.qualityCheck` JSON 持久化（避免 M1 大迁移）。导师脚本为纯 TS 数据 + Decision 记录。

**Tech Stack:** Next.js 16.3 App Router、React 19、Prisma/MySQL、BullMQ、Vitest、Playwright、既有 Tiptap/ECharts。

**Spec:** `docs/superpowers/specs/2026-08-11-stepdone-post-slice-roadmap-design.md`  
**Depends on:** 垂直切片主链路可用；M0 工作区基线先入库。

## Global Constraints

- 仍 **mock** 登录/支付/模型；禁止引入真微信/COS/真搜索
- 质量闸门：**软提示**，`force=true` 可强制导出并记 `FORCE_EXPORT`
- 引用：**只读**抽屉，不支持编辑绑定
- 导师：步骤脚本一次一问；报告/判断页 intent ∈ `{rewrite, shorten, explain_source}`
- PRO 权益消费：`RESEARCH_RETRY` / `REPORT_REGENERATE` 扣减后触发重跑；失败 **不自动退回** 权益
- 改 Next 约定前读 `apps/web/node_modules/next/dist/docs/`
- 每个 Task 结束必须 commit；保持 `pnpm test:e2e` 主链路绿

### File map（本计划锁定）

| 路径 | 职责 |
|---|---|
| `packages/domain/src/errors.ts` | 增加 `QUALITY_WARNING` 等错误码 |
| `packages/payments/src/consume.ts` | 权益扣减事务 |
| `packages/payments/src/consume.test.ts` | 余额/不足单测 |
| `apps/agent-worker/src/fixtures/index.ts` | 写 Citation；ABILITY 聚合前仍可写 skills 骨架 |
| `apps/agent-worker/src/runner.ts` | RESEARCH/REPORT 落 Citation；ABILITY 读库聚合 |
| `apps/web/lib/mentor/scripts.ts` | 各步导师脚本 |
| `apps/web/lib/mentor/intents.ts` | 受限提问 fixture 回复 |
| `apps/web/lib/quality.ts` | 读写 `metadata.qualityCheck` |
| `apps/web/app/api/projects/[projectId]/citations/route.ts` | 列引用 |
| `apps/web/app/api/entitlements/consume/route.ts` | 消费权益 API |
| `apps/web/app/api/projects/[projectId]/quality-check/route.ts` | GET/PATCH 质量问题 |
| `apps/web/app/api/projects/[projectId]/mentor/route.ts` | GET 当前导师问题 |
| `apps/web/app/api/projects/[projectId]/mentor/answer/route.ts` | POST 回答 |
| `apps/web/app/api/projects/[projectId]/mentor/ask/route.ts` | POST 受限提问 |
| `apps/web/app/api/artifacts/[artifactId]/exports/route.ts` | 质量软闸门 + force |
| `apps/web/components/workspace/citation-drawer.tsx` | 来源抽屉 |
| `apps/web/components/workspace/mentor-panel.tsx` | 可交互导师 |
| `apps/web/app/projects/[projectId]/{matrix,report,sources,competitors,quality}/page.tsx` | UI 接线 |
| `e2e/quality-force-export.spec.ts` 或扩展 `main-path` | 新路径覆盖 |

---

### Task 0: M0 基线入库

**Files:**
- Stage existing uncommitted slice polish (export runner, autosave, SSE, PPTX, objective markets, retry banner, etc.)
- Do **not** include `apps/web/.next/**`

**Interfaces:**
- Produces: clean git baseline on branch `0.0.1` so M1 diffs are reviewable

- [ ] **Step 1: Review status（排除构建缓存）**

```bash
git status --short | grep -v '^\?\? apps/web/\.next' | head -80
```

Expected: 看到 `export-runner.ts`、`use-autosave.ts`、`api/artifacts/`、`sample-deck.pptx` 等，无业务密钥文件。

- [ ] **Step 2: Stage and commit baseline**

```bash
git add \
  apps/agent-worker/src/export-runner.ts \
  apps/agent-worker/src/fixtures/index.ts \
  apps/agent-worker/src/index.ts \
  apps/agent-worker/src/outbox.ts \
  apps/agent-worker/src/queues.ts \
  apps/agent-worker/src/runner.ts \
  apps/web/app/api/artifacts \
  apps/web/app/api/exports \
  apps/web/app/api/sources \
  apps/web/app/projects \
  apps/web/components/steps/objective-form.tsx \
  apps/web/components/workspace \
  apps/web/hooks/use-autosave.ts \
  apps/web/hooks/use-project-events.ts \
  apps/web/lib/steps.ts \
  apps/web/public/samples/sample-deck.pptx \
  docs/superpowers/plans/CHECKLIST-0.0.1-slice.md \
  e2e/main-path.spec.ts

git commit -m "$(cat <<'EOF'
feat: land M0 slice polish baseline (export, autosave, SSE, retry)

Ship working-tree polish already verified by smoke/e2e so M1 can build
on a clean baseline without mixing unfinished mentor/citation work.
EOF
)"
```

- [ ] **Step 3: Verify tests still pass**

```bash
node scripts/smoke-main-path.mjs
pnpm test:e2e
```

Expected: `SMOKE_PASS`；Playwright 1 passed.

---

### Task 1: Citations — fixture 写入 + API + 抽屉

**Files:**
- Modify: `apps/agent-worker/src/runner.ts`（RESEARCH_SOURCES / GENERATE_REPORT 成功分支）
- Modify: `apps/agent-worker/src/fixtures/index.ts`（报告块可带 `sourceId` 占位）
- Create: `apps/web/app/api/projects/[projectId]/citations/route.ts`
- Create: `apps/web/components/workspace/citation-drawer.tsx`
- Modify: `apps/web/app/projects/[projectId]/matrix/page.tsx`
- Modify: `apps/web/app/projects/[projectId]/report/page.tsx`
- Test: 手工 + smoke 可选 curl（本任务以 API 返回为准）

**Interfaces:**
- Consumes: `Source` rows on project; `Citation` Prisma model
- Produces:

```typescript
// GET /api/projects/:projectId/citations
type CitationsResponse = {
  citations: Array<{
    publicId: string;
    quote: string | null;
    source: {
      publicId: string;
      title: string;
      publisher: string | null;
      url: string | null;
      credibility: string;
      summary: string | null;
    };
  }>;
};
```

- [ ] **Step 1: Write failing domain-agnostic check script expectation**

在 `scripts/smoke-main-path.mjs` 末尾（REPORT 之后）临时加入（下一步实现 API 后应通过）：

```javascript
const cites = await api("GET", `/api/projects/${projectId}/citations`);
if (!cites.success || !Array.isArray(cites.data.citations)) {
  throw new Error("CITATIONS_API_MISSING");
}
console.log("CITATIONS_OK", cites.data.citations.length);
```

- [ ] **Step 2: Run smoke to verify fail**

```bash
node scripts/smoke-main-path.mjs
```

Expected: FAIL with 404 or `CITATIONS_API_MISSING`.

- [ ] **Step 3: Implement GET citations route**

```typescript
// apps/web/app/api/projects/[projectId]/citations/route.ts
import { prisma } from "@stepdone/database";
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
    const citations = await prisma.citation.findMany({
      where: { source: { projectId: project.id } },
      include: { source: true },
      orderBy: { createdAt: "asc" },
    });
    return jsonOk({
      citations: citations.map((c) => ({
        publicId: c.publicId,
        quote: c.quote,
        source: {
          publicId: c.source.publicId,
          title: c.source.title,
          publisher: c.source.publisher,
          url: c.source.url,
          credibility: c.source.credibility,
          summary: c.source.summary,
        },
      })),
    });
  } catch (error) {
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
```

- [ ] **Step 4: In runner after creating sources, create Citation rows**

在 `RESEARCH_SOURCES` 循环 `source.create` 之后：

```typescript
await tx.citation.create({
  data: {
    publicId: newPublicId(),
    sourceId: created.id,
    quote: s.summary ?? s.title,
  },
});
```

（若 `create` 当前未接收返回值，改为 `const created = await tx.source.create(...)`。）

在 `GENERATE_REPORT` 创建 artifact 后，将项目已有 Citation 关联 `artifactId`：

```typescript
await tx.citation.updateMany({
  where: { source: { projectId: agentRun.projectId }, artifactId: null },
  data: { artifactId: artifact.id },
});
```

- [ ] **Step 5: Add CitationDrawer and wire matrix/report「来源」按钮**

```tsx
// apps/web/components/workspace/citation-drawer.tsx
"use client";
export function CitationDrawer({
  open,
  onClose,
  citations,
}: {
  open: boolean;
  onClose: () => void;
  citations: Array<{
    publicId: string;
    quote: string | null;
    source: {
      title: string;
      publisher: string | null;
      url: string | null;
      credibility: string;
      summary: string | null;
    };
  }>;
}) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 60 }}
      onClick={onClose}
      data-testid="citation-drawer"
    >
      <div
        className="sd-card"
        style={{ position: "absolute", right: 0, top: 0, height: "100%", width: "min(420px,100%)", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>来源引用</h3>
        {!citations.length ? <p className="sd-muted">暂无引用</p> : null}
        {citations.map((c) => (
          <div key={c.publicId} style={{ marginBottom: 12 }}>
            <strong>{c.source.title}</strong>
            <div className="sd-muted">
              {c.source.publisher ?? "未知"} · {c.source.credibility}
            </div>
            <p>{c.source.summary ?? c.quote}</p>
            {c.source.url ? (
              <a href={c.source.url} target="_blank" rel="noreferrer">
                打开链接
              </a>
            ) : null}
          </div>
        ))}
        <button className="sd-btn sd-btn-secondary" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}
```

在 matrix / report 页用 `useQuery` 拉 citations，按钮 `data-testid="open-citations"`。

- [ ] **Step 6: Re-run smoke**

```bash
node scripts/smoke-main-path.mjs
```

Expected: `CITATIONS_OK` 且 length ≥ 1。

- [ ] **Step 7: Commit**

```bash
git add apps/agent-worker/src/runner.ts apps/web/app/api/projects/\[projectId\]/citations \
  apps/web/components/workspace/citation-drawer.tsx \
  apps/web/app/projects/\[projectId\]/matrix/page.tsx \
  apps/web/app/projects/\[projectId\]/report/page.tsx \
  scripts/smoke-main-path.mjs
git commit -m "feat: expose read-only citations drawer for matrix and report"
```

---

### Task 2: Entitlement consume + PRO 重跑入口

**Files:**
- Create: `packages/payments/src/consume.ts`
- Create: `packages/payments/src/consume.test.ts`
- Modify: `packages/payments/src/index.ts`
- Create: `apps/web/app/api/entitlements/consume/route.ts`
- Modify: `apps/web/app/projects/[projectId]/sources/page.tsx`
- Modify: `apps/web/app/projects/[projectId]/report/page.tsx`
- Modify: `apps/web/lib/steps.ts`（确保 consume 后 `enqueueNode` 可用）

**Interfaces:**
- Consumes: `Entitlement` / `EntitlementTransaction`；`enqueueNode`
- Produces:

```typescript
// packages/payments/src/consume.ts
export type ConsumeInput = {
  userId: bigint;
  projectId: bigint;
  type: "RESEARCH_RETRY" | "REPORT_REGENERATE" | "PPT_EXPORT" | "REPORT_EXPORT";
  reason: string;
};
export async function consumeEntitlement(input: ConsumeInput): Promise<{
  remaining: number;
  entitlementPublicId: string;
}>;
```

```typescript
// POST /api/entitlements/consume
// body: { projectId: string; type: "RESEARCH_RETRY" | "REPORT_REGENERATE" }
// success → also enqueues node; returns { remaining, agentRunId? }
```

- [ ] **Step 1: Write failing unit test**

```typescript
// packages/payments/src/consume.test.ts
import { describe, expect, it } from "vitest";
import { consumeEntitlement } from "./consume";

describe("consumeEntitlement", () => {
  it("throws ENTITLEMENT_REQUIRED when remaining is 0", async () => {
    // Use a thin fake: export internal helper assertCanConsume for pure logic,
    // OR integration-style with prisma mocked.
    // Prefer extracting:
    // export function nextRemaining(remaining: number): number
    await expect(async () => {
      const { assertHasRemaining } = await import("./consume");
      assertHasRemaining(0);
    }).rejects.toThrow(/ENTITLEMENT_REQUIRED/);
  });

  it("decrements remaining by 1", async () => {
    const { applyConsumeDelta } = await import("./consume");
    expect(applyConsumeDelta(2)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify fail**

```bash
pnpm --filter @stepdone/payments test
```

Expected: FAIL module/export missing.

- [ ] **Step 3: Implement consume helpers + transaction**

```typescript
// packages/payments/src/consume.ts
import { prisma, newPublicId } from "@stepdone/database";
import { ErrorCodes } from "@stepdone/domain";

export function assertHasRemaining(remaining: number) {
  if (remaining <= 0) {
    throw new Error(`${ErrorCodes.ENTITLEMENT_REQUIRED}: entitlement exhausted`);
  }
}

export function applyConsumeDelta(remaining: number) {
  assertHasRemaining(remaining);
  return remaining - 1;
}

export async function consumeEntitlement(input: {
  userId: bigint;
  projectId: bigint;
  type: string;
  reason: string;
}) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.entitlement.findFirst({
      where: {
        userId: input.userId,
        projectId: input.projectId,
        type: input.type,
        remaining: { gt: 0 },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!row) {
      throw new Error(`${ErrorCodes.ENTITLEMENT_REQUIRED}: missing ${input.type}`);
    }
    const remaining = applyConsumeDelta(row.remaining);
    const updated = await tx.entitlement.update({
      where: { id: row.id },
      data: { remaining },
    });
    await tx.entitlementTransaction.create({
      data: {
        entitlementId: row.id,
        delta: -1,
        reason: input.reason,
      },
    });
    return {
      remaining: updated.remaining,
      entitlementPublicId: updated.publicId,
    };
  });
}
```

Export from `index.ts`: `export * from "./consume";`

- [ ] **Step 4: Run unit tests**

```bash
pnpm --filter @stepdone/payments test
```

Expected: PASS.

- [ ] **Step 5: Implement API route that consumes + enqueues**

```typescript
// apps/web/app/api/entitlements/consume/route.ts
import { ErrorCodes } from "@stepdone/domain";
import { consumeEntitlement } from "@stepdone/payments";
import { jsonOk, jsonErr } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getOwnedProject } from "@/lib/projects";
import { enqueueNode } from "@/lib/steps";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as {
      projectId?: string;
      type?: "RESEARCH_RETRY" | "REPORT_REGENERATE";
    };
    if (!body.projectId || !body.type) {
      return jsonErr("VALIDATION_ERROR", "projectId and type required", 400);
    }
    const project = await getOwnedProject(user.id, body.projectId);
    if (!project) {
      return jsonErr(ErrorCodes.PROJECT_NOT_FOUND, "项目不存在或无权访问", 404);
    }
    const consumed = await consumeEntitlement({
      userId: user.id,
      projectId: project.id,
      type: body.type,
      reason: body.type,
    });
    const nodeCode =
      body.type === "RESEARCH_RETRY" ? "RESEARCH_SOURCES" : "GENERATE_REPORT";
    const latest = await (await import("@stepdone/database")).prisma.projectStepRun.findFirst({
      where: { projectId: project.id, nodeCode },
      orderBy: { createdAt: "desc" },
    });
    const result = await enqueueNode({
      projectId: project.id,
      projectPublicId: project.publicId,
      userId: user.id,
      nodeCode,
      inputVersion: (latest?.inputVersion ?? 1) + 1,
    });
    return jsonOk({
      remaining: consumed.remaining,
      agentRunId: result.agentRun.publicId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "consume failed";
    if (message.includes("ENTITLEMENT_REQUIRED")) {
      return jsonErr(ErrorCodes.ENTITLEMENT_REQUIRED, "权益不足或需要专业版", 402);
    }
    const err = error as { code?: string; status?: number };
    return jsonErr(err.code ?? "AUTH_REQUIRED", "未登录", err.status ?? 401);
  }
}
```

- [ ] **Step 6: UI buttons**

- sources 页：若 entitlements 含 `RESEARCH_RETRY` remaining>0，显示「重新搜集」`data-testid="research-retry"`，否则禁用并文案「需专业版重试」。
- report 页：同理 `REPORT_REGENERATE` → `data-testid="report-regenerate"`。
- STANDARD 支付路径保持 PPT 锁定按钮（已有）。

- [ ] **Step 7: Manual smoke with PRO pay（optional script note）**

用现有 preview 流支付 `PRO_PROJECT` 后：

```bash
curl -s -b /tmp/sd.cookie -X POST http://localhost:3000/api/entitlements/consume \
  -H 'content-type: application/json' \
  -d '{"projectId":"<id>","type":"RESEARCH_RETRY"}'
```

Expected: 200 且 `remaining: 0`；再调一次 402。

- [ ] **Step 8: Commit**

```bash
git add packages/payments apps/web/app/api/entitlements/consume \
  apps/web/app/projects/\[projectId\]/sources/page.tsx \
  apps/web/app/projects/\[projectId\]/report/page.tsx
git commit -m "feat: consume PRO research/report entitlements and enqueue reruns"
```

---

### Task 3: Quality soft gate

**Files:**
- Modify: `packages/domain/src/errors.ts`
- Create: `apps/web/lib/quality.ts`
- Create: `apps/web/lib/quality.test.ts`
- Create: `apps/web/app/api/projects/[projectId]/quality-check/route.ts`
- Modify: `apps/agent-worker/src/runner.ts`（QUALITY_REVIEW 完成后写入 metadata）
- Modify: `apps/web/app/api/artifacts/[artifactId]/exports/route.ts`
- Modify: `apps/web/app/projects/[projectId]/quality/page.tsx`
- Modify: `apps/web/app/projects/[projectId]/report/page.tsx`（导出确认弹层）

**Interfaces:**
- Produces:

```typescript
// apps/web/lib/quality.ts
export type QualityIssue = {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  status: "OPEN" | "RESOLVED";
};
export type QualityCheckState = { issues: QualityIssue[] };

export function listBlockingIssues(state: QualityCheckState): QualityIssue[];
export function markIssueResolved(state: QualityCheckState, id: string): QualityCheckState;
```

Export body: `{ format, force?: boolean }`  
若有 blocking 且 `!force` → `jsonErr("QUALITY_WARNING", "...", 409)` + `details.issues`（若 `jsonErr` 不支持 details，则 message 内附 JSON，或扩展 `jsonErr` 增加 optional `details`）。

- [ ] **Step 1: Add ErrorCodes + pure helpers with tests**

```typescript
// packages/domain/src/errors.ts — add:
QUALITY_WARNING: "QUALITY_WARNING",
```

```typescript
// apps/web/lib/quality.ts
export type QualityIssue = {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  status: "OPEN" | "RESOLVED";
};
export type QualityCheckState = { issues: QualityIssue[] };

export function listBlockingIssues(state: QualityCheckState) {
  return state.issues.filter(
    (i) =>
      i.status === "OPEN" && (i.severity === "HIGH" || i.severity === "MEDIUM"),
  );
}

export function markIssueResolved(state: QualityCheckState, id: string) {
  return {
    issues: state.issues.map((i) =>
      i.id === id ? { ...i, status: "RESOLVED" as const } : i,
    ),
  };
}
```

```typescript
// apps/web/lib/quality.test.ts
import { describe, expect, it } from "vitest";
import { listBlockingIssues, markIssueResolved } from "./quality";

describe("quality gate", () => {
  it("blocks open HIGH/MEDIUM only", () => {
    const blocking = listBlockingIssues({
      issues: [
        { id: "1", severity: "HIGH", message: "x", status: "OPEN" },
        { id: "2", severity: "LOW", message: "y", status: "OPEN" },
        { id: "3", severity: "MEDIUM", message: "z", status: "RESOLVED" },
      ],
    });
    expect(blocking.map((b) => b.id)).toEqual(["1"]);
  });

  it("marks resolved", () => {
    const next = markIssueResolved(
      { issues: [{ id: "1", severity: "MEDIUM", message: "m", status: "OPEN" }] },
      "1",
    );
    expect(next.issues[0].status).toBe("RESOLVED");
  });
});
```

若 web 包尚无 vitest，把纯函数放到 `packages/project-engine` 或 `packages/domain` 并测那里——**优先放 `packages/domain/src/quality.ts`** 以避免 Next 测配置。计划采用：

- Create: `packages/domain/src/quality.ts` + `quality.test.ts`
- web `lib/quality.ts` re-export 或直接从 `@stepdone/domain` import

- [ ] **Step 2: Run unit tests**

```bash
pnpm --filter @stepdone/domain test
```

Expected: PASS（先写测再实现 helpers）。

- [ ] **Step 3: Persist quality on QUALITY_REVIEW success**

在 runner `QUALITY_REVIEW` 完成后：

```typescript
const output = result.output as { issues?: unknown[]; scores?: unknown };
const prev = (agentRun.project.metadata ?? {}) as Record<string, unknown>;
await tx.project.update({
  where: { id: agentRun.projectId },
  data: {
    metadata: {
      ...prev,
      qualityCheck: {
        scores: output.scores ?? {},
        issues: output.issues ?? [],
      },
    },
  },
});
```

确保 fixture 至少含一条 `severity: "MEDIUM", status: "OPEN"`（已有）。

- [ ] **Step 4: quality-check GET/PATCH API**

```typescript
// GET → { scores, issues }
// PATCH body: { issueId: string, status: "RESOLVED" }
// 读写 project.metadata.qualityCheck，校验所有权
```

- [ ] **Step 5: Gate exports route**

```typescript
const body = (await request.json()) as { format?: "PDF" | "PPTX"; force?: boolean };
// after entitlement check:
const meta = (artifact.project.metadata ?? {}) as {
  qualityCheck?: { issues: Array<{ id: string; severity: string; status: string; message: string }> };
};
const state = { issues: meta.qualityCheck?.issues ?? [] };
const blocking = listBlockingIssues(state as never);
if (blocking.length && !body.force) {
  return jsonErr(
    ErrorCodes.QUALITY_WARNING,
    "存在未处理的质量问题，确认后可强制导出",
    409,
  );
}
if (blocking.length && body.force) {
  await prisma.projectDecision.create({
    data: {
      publicId: newPublicId(),
      projectId: artifact.projectId,
      nodeCode: "EXPORT",
      action: "FORCE_EXPORT",
      payload: { issueIds: blocking.map((b) => b.id), format },
    },
  });
}
```

注意：`getOwnedProject` / artifact include 需带 `metadata`。若 `artifact.project` 未 select metadata，改为重新 `findUnique` project。

- [ ] **Step 6: UI — quality page patches server; report export handles 409**

导出流程：

1. POST exports without force  
2. 若 `QUALITY_WARNING` → 弹窗列出问题，确认后带 `force: true`  
3. `data-testid="export-force-confirm"`

- [ ] **Step 7: Commit**

```bash
git add packages/domain apps/web/lib/quality.ts apps/web/app/api/projects/\[projectId\]/quality-check \
  apps/web/app/api/artifacts/\[artifactId\]/exports/route.ts \
  apps/agent-worker/src/runner.ts \
  apps/web/app/projects/\[projectId\]/quality/page.tsx \
  apps/web/app/projects/\[projectId\]/report/page.tsx
git commit -m "feat: persist quality issues and soft-block exports until force"
```

---

### Task 4: 建议 → 采用 → ArtifactVersion

**Files:**
- Modify: `apps/web/app/api/artifacts/[artifactId]/route.ts`（确认 PATCH 已创建 version；补 GET 返回 version）
- Modify: `apps/web/app/projects/[projectId]/report/page.tsx`
- Modify: `apps/web/lib/mentor/intents.ts`（Task 5 会完善；本任务先本地 suggestion 采用）

**Interfaces:**
- Consumes: existing PATCH creating `ArtifactVersion`
- Produces: UI shows `v{n}` from GET artifact；adopt increments n

- [ ] **Step 1: Extend GET artifact response**

返回 `version`（已有则核对）与 `versionsCount`：

```typescript
versionsCount: artifact.versions.length, // or count query
version: artifact.versions[0]?.version ?? 0,
```

- [ ] **Step 2: Report page — adopt creates version via persistContent**

将「采用」改为调用已有 `persistContent()`（或共用），成功后 `refetch` artifacts 并展示：

```tsx
<p className="sd-muted" data-testid="report-version">版本 v{version}</p>
```

采用前后各 persist 一次应使 version +1（第二次采用不同建议）。

- [ ] **Step 3: Manual check**

打开报告 → 点「改写」→「采用」→ 刷新 → 正文仍在且版本 ≥ 2。

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/artifacts/\[artifactId\]/route.ts \
  apps/web/app/projects/\[projectId\]/report/page.tsx
git commit -m "feat: show artifact version after adopting AI suggestions"
```

---

### Task 5: Mentor scripts + ask API + panel

**Files:**
- Create: `apps/web/lib/mentor/scripts.ts`
- Create: `apps/web/lib/mentor/intents.ts`
- Create: `apps/web/lib/mentor/scripts.test.ts`
- Create: `apps/web/app/api/projects/[projectId]/mentor/route.ts`
- Create: `apps/web/app/api/projects/[projectId]/mentor/answer/route.ts`
- Create: `apps/web/app/api/projects/[projectId]/mentor/ask/route.ts`
- Create: `apps/web/components/workspace/mentor-panel.tsx`
- Modify: `apps/web/components/workspace/workspace-shell.tsx`（接入 MentorPanel；保留 children mentor 作为 fallback 文案）

**Interfaces:**
- Produces:

```typescript
// apps/web/lib/mentor/scripts.ts
export type MentorStepKey =
  | "plan" | "competitors" | "sources" | "dimensions"
  | "matrix" | "decisions" | "preview" | "report" | "quality" | "ability";

export type MentorQuestion = {
  id: string;
  question: string;
  options: Array<{ id: string; label: string }>;
};

export function getMentorScript(step: MentorStepKey): MentorQuestion[];
export function nextMentorIndex(answeredIds: string[], step: MentorStepKey): number; // -1 if done
```

```typescript
// POST /mentor/ask body: { intent: "rewrite" | "shorten" | "explain_source"; selection?: string }
// → { suggestion: string }
```

- [ ] **Step 1: Failing tests for script progression**

```typescript
import { describe, expect, it } from "vitest";
import { getMentorScript, nextMentorIndex } from "./scripts";

describe("mentor scripts", () => {
  it("has at least one question per core step", () => {
    for (const step of ["plan", "competitors", "sources", "decisions", "report"] as const) {
      expect(getMentorScript(step).length).toBeGreaterThan(0);
    }
  });

  it("returns -1 when all answered", () => {
    const qs = getMentorScript("plan");
    expect(nextMentorIndex(qs.map((q) => q.id), "plan")).toBe(-1);
  });
});
```

- [ ] **Step 2: Implement scripts + intents**

每步 1～2 问即可，例如 plan：

```typescript
{
  id: "plan_scope",
  question: "这个计划的范围是否够你向老板汇报？",
  options: [
    { id: "ok", label: "够用，继续" },
    { id: "narrow", label: "需要再收窄" },
  ],
}
```

```typescript
// intents.ts
const ALLOWED = new Set(["rewrite", "shorten", "explain_source"]);
export function assertMentorIntent(intent: string) {
  if (!ALLOWED.has(intent)) throw new Error("VALIDATION_ERROR: invalid intent");
}
export function mentorReply(intent: string, selection = "") {
  assertMentorIntent(intent);
  if (intent === "rewrite") {
    return `建议改写：将表述更克制。原文片段：${selection || "（未选中）"}`;
  }
  if (intent === "shorten") {
    return "建议缩短：保留核心差异与一条行动建议。";
  }
  return "该结论可对照资料页中可信度 HIGH 的来源复核时效。";
}
```

- [ ] **Step 3: APIs**

- `GET .../mentor?step=plan`：查 `ProjectDecision` where `action=MENTOR_ANSWER` & payload.step；算下一问  
- `POST .../mentor/answer`：`{ step, questionId, optionId }` → create Decision → return `{ next, done }`  
- `POST .../mentor/ask`：仅当 step 为 decisions/report；返回 suggestion  

- [ ] **Step 4: MentorPanel UI**

显示 question + options；`done` 时显示静态 tip。报告页额外三个按钮触发 ask。`data-testid="mentor-option"`。

- [ ] **Step 5: Run mentor unit tests + manual click through plan page**

```bash
pnpm --filter @stepdone/web exec vitest run lib/mentor/scripts.test.ts
# 若 web 无 vitest：把 scripts 放到 packages/agent-core 或 packages/domain 再测
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/mentor apps/web/app/api/projects/\[projectId\]/mentor \
  apps/web/components/workspace/mentor-panel.tsx \
  apps/web/components/workspace/workspace-shell.tsx
git commit -m "feat: interactive mentor scripts and restricted ask intents"
```

---

### Task 6: 资料添加 URL + 竞品自定义

**Files:**
- Modify: `apps/web/app/projects/[projectId]/sources/page.tsx`
- Modify: `apps/web/app/projects/[projectId]/competitors/page.tsx`
- Modify: `apps/web/app/api/projects/[projectId]/sources/route.ts`（URL 格式校验）

**Interfaces:**
- Consumes: existing `POST /api/projects/:id/sources`
- Produces: UI forms；competitors decision payload includes custom names

- [ ] **Step 1: Sources URL form**

```tsx
const [url, setUrl] = useState("");
const [title, setTitle] = useState("");
// button data-testid="add-source-url"
await api(`/api/projects/${projectId}/sources`, {
  method: "POST",
  body: JSON.stringify({ title: title || url, url, publisher: "用户添加" }),
});
```

API 校验：

```typescript
if (body.url) {
  try {
    const u = new URL(body.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error("bad");
  } catch {
    return jsonErr("VALIDATION_ERROR", "url 无效", 400);
  }
}
```

- [ ] **Step 2: Competitors custom add**

在选择列表旁：

```tsx
<input data-testid="custom-competitor" />
<button type="button" data-testid="add-competitor" onClick={...}>添加竞品</button>
```

将自定义名并入 selected，随 confirm decision payload：`{ selectedCompetitorIds, customCompetitors: string[] }`。

- [ ] **Step 3: Manual check + commit**

```bash
git add apps/web/app/projects/\[projectId\]/sources/page.tsx \
  apps/web/app/projects/\[projectId\]/competitors/page.tsx \
  apps/web/app/api/projects/\[projectId\]/sources/route.ts
git commit -m "feat: allow adding source URLs and custom competitors"
```

---

### Task 7: Ability 真实聚合

**Files:**
- Create: `apps/agent-worker/src/ability-aggregate.ts`
- Create: `apps/agent-worker/src/ability-aggregate.test.ts`（纯函数测计数）
- Modify: `apps/agent-worker/src/runner.ts`（ABILITY_REPORT 分支）
- Modify: `apps/web/app/projects/[projectId]/ability/page.tsx`（去掉主路径 DEFAULT 掩盖）

**Interfaces:**
- Produces:

```typescript
export function aggregateParticipation(input: {
  mentorAnswers: number;
  judgments: number;
  userVersions: number;
  userSources: number;
}): {
  decisions: number;
  adopted: number;
  edited: number;
  sourcesAdded: number;
};

export function scoresFromParticipation(p: ReturnType<typeof aggregateParticipation>): Record<string, number>;
```

- [ ] **Step 1: Failing tests for aggregation math**

```typescript
import { describe, expect, it } from "vitest";
import { aggregateParticipation, scoresFromParticipation } from "./ability-aggregate";

describe("ability aggregate", () => {
  it("sums decisions from mentor + judgments", () => {
    const p = aggregateParticipation({
      mentorAnswers: 2,
      judgments: 3,
      userVersions: 1,
      userSources: 1,
    });
    expect(p.decisions).toBe(5);
    expect(p.adopted).toBe(1);
    expect(p.sourcesAdded).toBe(1);
  });
});
```

- [ ] **Step 2: Implement + wire runner**

ABILITY_REPORT 成功前查询：

```typescript
const mentorAnswers = await tx.projectDecision.count({
  where: { projectId, action: "MENTOR_ANSWER" },
});
const judgments = await tx.projectDecision.count({
  where: { projectId, action: { in: ["SUBMIT_JUDGMENTS", "CONFIRM_JUDGMENT"] } },
});
// 按仓库实际 judgment action 名调整（读 decisions 页 POST body）
const userVersions = await tx.artifactVersion.count({
  where: { createdBy: "USER", artifact: { projectId } },
});
const userSources = await tx.source.count({
  where: { projectId, publisher: "用户添加" },
});
```

写入 `SkillAssessment`（按 dimension code upsert）+ step output。

- [ ] **Step 3: Ability UI uses output.skills / participation only；loading 态保留**

无数据时显示「生成中/暂无数据」，不要静默用漂亮假雷达冒充已生成。

- [ ] **Step 4: Commit**

```bash
git add apps/agent-worker/src/ability-aggregate.ts \
  apps/agent-worker/src/ability-aggregate.test.ts \
  apps/agent-worker/src/runner.ts \
  apps/web/app/projects/\[projectId\]/ability/page.tsx
git commit -m "feat: aggregate ability report from real project decisions"
```

---

### Task 8: E2E / smoke / checklist 收尾

**Files:**
- Modify: `scripts/smoke-main-path.mjs`（保留 CITATIONS；可选 quality GET）
- Create: `e2e/quality-force-export.spec.ts` **或** 扩展 `e2e/main-path.spec.ts`
- Modify: `docs/superpowers/plans/CHECKLIST-0.0.1-slice.md` 或新建 `CHECKLIST-m1-slice-polish.md`

**Interfaces:**
- Produces: green CI-local commands documented in checklist

- [ ] **Step 1: Add E2E covering quality warning path**

最短路径（在已有登录项目上较难）；建议在 `main-path` 导出前：

```typescript
await page.getByTestId("export-pdf").click();
// If quality warning dialog appears:
const force = page.getByTestId("export-force-confirm");
if (await force.isVisible().catch(() => false)) {
  await force.click();
}
await expect(page.getByText("导出完成")).toBeVisible({ timeout: 30_000 });
```

另加：

```typescript
await page.getByTestId("open-citations").click();
await expect(page.getByTestId("citation-drawer")).toBeVisible();
```

- [ ] **Step 2: Run full verification**

```bash
pnpm --filter @stepdone/domain test
pnpm --filter @stepdone/payments test
pnpm --filter @stepdone/agent-worker test
node scripts/smoke-main-path.mjs
pnpm test:e2e
```

Expected: all PASS / SMOKE_PASS.

- [ ] **Step 3: Write M1 checklist file**

```markdown
# M1 Slice Polish Checklist
- [x] citations drawer
- [x] PRO consume research/report
- [x] quality soft gate + force
- [x] report version on adopt
- [x] mentor scripts + ask
- [x] add URL + custom competitor
- [x] ability real counts
- [x] smoke + e2e green
```

- [ ] **Step 4: Commit**

```bash
git add e2e scripts/smoke-main-path.mjs docs/superpowers/plans/CHECKLIST-m1-slice-polish.md
git commit -m "test: cover M1 citations and quality-force export paths"
```

---

## Spec coverage self-check

| Spec 要求 | Task |
|---|---|
| M0 基线入库 | Task 0 |
| 引用只读可见 | Task 1 |
| PRO 权益可扣减 | Task 2 |
| 质量软闸门 | Task 3 |
| 建议→采用→版本 | Task 4 |
| 导师脚本+受限提问 | Task 5 |
| 资料 URL + 自定义竞品 | Task 6 |
| 能力真实计数 | Task 7 |
| E2E/验收 | Task 8 |
| 不包含微信/真模型/COS/拖拽矩阵等 | 全计划未列入 |

## Placeholder scan

无 TBD/TODO 步骤；判断 Decision 的精确 `action` 字符串在 Task 7 要求实现者读取 `decisions/page.tsx` 的实际 POST body（仓库现存值），避免计划与代码漂移。

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-11-stepdone-m1-slice-polish.md`.

**Two execution options:**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理，Task 间审查，迭代快  
2. **Inline Execution** — 本会话用 executing-plans 批量执行并设检查点  

Which approach?
