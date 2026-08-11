# StepDone AI — 切片后未开发内容路线图与 M1 设计规格

**产品**：逐成 AI（StepDone AI）  
**文档版本**：0.0.1-post-slice-roadmap  
**日期**：2026-08-11  
**状态**：已通过对话设计评审（grilling 锁定），待实施计划  
**依据**：`docs/prd/0.0.1-prd.md`、`docs/tech/0.0.1-tech.md`、`docs/superpowers/specs/2026-08-10-stepdone-0.0.1-vertical-slice-design.md`

---

## 1. 目标与里程碑边界

### 1.1 目标

在已可跑通的垂直切片之上，按里程碑补齐 PRD / Tech 中尚未开发（或仅 stub）的内容。  
本规格锁定 **全路线图边界**；**详细实施只展开 M1**。M2 / M3 仅锁目标与非目标，临近再拆任务级计划。

### 1.2 文档与计划结构

- 一份总路线图（本文）+ **仅 M1** 进入下一阶段的详细实施计划  
- 不一次写满 M1–M3 全部任务级细节（避免过期与范围膨胀）

### 1.3 里程碑一览

| 里程碑 | 目标 | 非目标 |
|---|---|---|
| **M0（基线）** | 合并当前工作区已完成的导出状态机、自动保存/冲突、SSE/轮询、合法 PPTX、表单市场字段、失败重试等 | 新功能 |
| **M1 切片体验闭环** | 导师（步骤脚本 + 受限提问）、引用只读可见、建议→采用→版本、质量软闸门、PRO 权益可扣减消费、资料添加 URL、竞品添加自定义、能力报告真实计数、E2E 覆盖关键新路径 | 真微信 / 真模型 / COS / 项目归档 / 维度拖拽 / 矩阵单元格编辑 |
| **M2 微信闭环** | 微信登录、微信支付、小程序 WebView 壳、订单列表 / 注销 / 数据导出薄实现 | 真模型、真搜索 |
| **M3a** | AI 网关替换关键节点 fixture（计划 / 研究 / 判断 / 报告等） | 全文快照、真排版 |
| **M3b** | 搜索 / 抓取 + `source_snapshots` + COS 真 PDF/PPT | 多模板、分享、运营后台 |

### 1.4 产品级完成定义

- **M1 结束**：内部 demo 不再依赖「假导师静态文案 / 看不见来源 / 专业权益点不动」  
- **M2 结束**：微信内可登录并完成一笔真支付解锁报告  
- **M3b 结束**：报告内容与导出文件来自真实管线（可审计来源）

### 1.5 明确排除（M1–M3 之外，进 0.0.2+）

- 分享链接 / 项目复制  
- 语音输入  
- 多模板（营销 / 求职等）  
- 维度拖拽与自定义、矩阵单元格编辑  
- 离线 IndexedDB  
- 独立 `export-worker` / 运营后台 / 退款自动化  

### 1.6 M1 实施顺序（风险优先）

1. 引用可见  
2. 专业权益扣减  
3. 质量软闸门与落库  
4. 报告建议 / 版本  
5. 导师脚本 + 受限提问  
6. 资料 URL / 添加竞品  
7. 能力真实计数  
8. E2E 扩充  

---

## 2. M1 架构与模块

### 2.1 原则

沿用现有 monorepo，**不新建服务**。M1 增量落在 `apps/web` BFF、`apps/agent-worker` fixture、现有 Prisma 表。

```text
[Web UI]
  mentor panel / citation drawer / report adopt / quality confirm / entitlement buttons
        │
        ▼
[Next API / BFF]
  /mentor/*  /citations  /artifacts versions  /quality-check
  /entitlements/consume  /sources POST  /competitors add
        │
        ├─ MySQL: Decision / Citation / ArtifactVersion / Entitlement(+Tx)
        │         Quality issues (JSON) / SkillAssessment
        └─ Outbox → BullMQ → agent-worker（RESEARCH_RETRY / REPORT_REGENERATE 重跑 fixture）
```

### 2.2 模块划分

| 模块 | 职责 | 主要落点 |
|---|---|---|
| **Mentor** | 步骤脚本状态机 + 受限提问白名单；一次一问 | `web/lib/mentor`（或 `packages/agent-core` 轻量脚本）；决策记 `ProjectDecision`（action 前缀 `MENTOR_`） |
| **Citations** | fixture 写 Citation；矩阵 / 报告只读抽屉 | 已有 `Citation`；`GET` by project/artifact |
| **Report Versions** | 「建议→采用」创建新 `ArtifactVersion`（createdBy=USER/AI） | 已有表；UI 显示版本号与简短摘要 |
| **Quality Gate** | issue 服务端持久化；导出前软确认 | `GET/PATCH .../quality-check`；issue 存项目级 JSON 或 artifact output，**不强制新表** |
| **Entitlements** | `consume(type)` 事务扣减 + 触发重跑 | 已有 `Entitlement` / `EntitlementTransaction`；接「重新搜集」「重新生成」 |
| **Sources / Competitors UX** | 添加 URL；添加其他竞品 | 已有 sources POST；competitors decision payload 扩展 |
| **Ability Aggregate** | 从 Decision / Version / Source 计数写 `SkillAssessment` | Worker `ABILITY_REPORT` 读库聚合 |

### 2.3 刻意不做的结构变化

- 不上独立 mentor-service / quality-service  
- 不引入 `source_snapshots`（归 M3b）  
- 不改支付模型（M1 仍 mock）  

---

## 3. M1 数据流与关键交互契约

### 3.1 导师（脚本 + 受限提问）

1. 进入步骤页 → `GET /api/projects/:id/mentor?step=` 返回当前问题（`question`、`options[]`、`allowFreeText`）  
2. 用户点选项 → `POST .../mentor/answer` → 写 `ProjectDecision(action=MENTOR_ANSWER)` → 返回下一问或 `done`  
3. 报告 / 判断页受限提问 → `POST .../mentor/ask`，`intent` ∈ `{rewrite, shorten, explain_source}`；规则 / fixture 回复，**不调用真模型**  
4. 同一步同时只展示一问；`done` 后侧栏回到该步静态提示  

### 3.2 引用只读

1. `RESEARCH_SOURCES` / `GENERATE_REPORT` fixture 创建 `Citation(sourceId, artifactId?, quote?)`  
2. `GET /api/projects/:id/citations`  
3. 矩阵单元格 / 报告段落旁「来源」→ 抽屉展示 title、credibility、summary、url（若有）  
4. **不支持**用户编辑绑定来源  

### 3.3 建议 → 采用 → 版本

1. 导师 / 工具返回 `suggestion`（纯文本或 block patch）  
2. 用户点「采用」→ `PATCH /api/artifacts/:id` 写入 content，**必增** `ArtifactVersion`（`createdBy=USER`）  
3. UI 展示 `v{n}`；可选「与上一版对比」用简单文本摘要（非全文 diff 编辑器）  

### 3.4 质量软闸门

1. `QUALITY_REVIEW` 完成后 issues 持久化（项目级 JSON 或 artifact output）  
2. `GET/PATCH /api/projects/:id/quality-check`：标记 issue `RESOLVED`  
3. `POST .../exports` 前：若存在未处理且 `severity ∈ {HIGH, MEDIUM}` → 返回业务码 `QUALITY_WARNING` + 问题列表  
4. 客户端二次确认带 `force=true` 才真正创建 export；并记 `ProjectDecision(action=FORCE_EXPORT)`  

### 3.5 专业权益消费

```text
UI 点击「重新搜集」/「重新生成」
  → POST /api/entitlements/consume { projectId, type }
  → 事务: remaining>0 ? remaining-- + EntitlementTransaction
  → 成功则 enqueue RESEARCH_SOURCES / GENERATE_REPORT（inputVersion+1）
  → STANDARD 或余额 0 → 402 ENTITLEMENT_REQUIRED
```

类型：

- `RESEARCH_RETRY` → 资料页「重新搜集」  
- `REPORT_REGENERATE` → 报告页「重新生成」  
- `PPT_EXPORT` → 导出 PPT（已有路径，保持）  

### 3.6 能力真实计数

`ABILITY_REPORT` 聚合：

- `MENTOR_*` / 判断类 `ProjectDecision` 数量  
- artifact `createdBy=USER` 的版本数（采用 / 编辑）  
- 用户新增 sources 数  

写入 `SkillAssessment` 并返回 `participation`；UI **不以写死 DEFAULT 作为主路径**。

### 3.7 资料 URL 与自定义竞品

- 资料页：调用已有 `POST /api/projects/:id/sources` 添加 URL（校验格式；fixture 可信度可标 `USER`）  
- 竞品页：允许添加自定义名称并进入已选集合，随 `SELECT_COMPETITORS` decision payload 提交  

---

## 4. 错误处理、验收与测试

### 4.1 错误与恢复

| 场景 | 行为 |
|---|---|
| 导师非法 intent | 400；不写 Decision |
| 引用为空 | 抽屉展示「暂无引用」；不阻断步骤 |
| 采用建议时冲突 | 409；走现有 ConflictDialog 或提示刷新后再采用 |
| 权益不足 | 402 + 专业差异文案 |
| 质量未处理强制导出 | 首次 `QUALITY_WARNING`；`force=true` 放行并记 `FORCE_EXPORT` |
| 重跑失败 | step=`FAILED_RETRYABLE` + RetryBanner；已扣权益 **不自动退回**（M1 简化） |
| SSE 断开 | 保持现有轮询降级 |

### 4.2 M1 验收清单

- [ ] 每步导师至少一问可点选完成  
- [ ] 报告 / 判断页受限提问三类 intent 可用  
- [ ] 矩阵或报告可打开以来源抽屉  
- [ ] 采用建议后版本号 +1 且可刷新恢复  
- [ ] 质量问题可服务端标记；导出遇未处理问题先警告，确认后可导出  
- [ ] PRO：重新搜集 / 重新生成扣减余额；STANDARD 不可用或 402  
- [ ] 能力页计数随真实操作变化（至少 decisions / adopted / sourcesAdded 之一）  
- [ ] 资料可添加 URL；竞品可添加自定义项  
- [ ] 现有 happy-path E2E 仍绿；新增至少 1 条覆盖权益或质量警告路径  

### 4.3 测试策略

- **单测**：entitlement consume 余额边界；mentor intent 白名单；quality force 门闩  
- **Smoke**：扩展 `smoke-main-path` 可选步骤（citations list / quality patch）  
- **E2E**：主链路保留；新增 `pro-regenerate` 或 `quality-force-export` 其一  

### 4.4 M2 / M3 边界（本规格不写任务级细节）

| 里程碑 | 必达 | 仍排除 |
|---|---|---|
| **M2** | 微信登录 + 微信支付 + 小程序 WebView 壳；订单 / 注销 / 数据导出薄实现 | 真模型、真搜索 |
| **M3a** | 模型网关替换关键 fixture 节点 | 全文快照、真排版 Worker |
| **M3b** | 搜索 / 抓取 + source_snapshots + COS 真 PDF/PPT | 多模板、分享、运营后台、自动退款 |

---

## 5. 与既有文档的关系

- **垂直切片规格**（2026-08-10）：定义已交付的 demo 切片；本文是其后的补齐路线  
- **PRD / Tech 0.0.1**：完整 MVP 仍以真微信 / 真模型 / 真导出为终局；本文将其拆为 M2 / M3，避免与「可演示切片」混为一谈  
- **CHECKLIST-0.0.1-slice**：切片验收已勾完；M1 使用本文 §4.2 新清单  

---

## 6. 锁定决策记录（grilling）

| 决策点 | 锁定值 |
|---|---|
| 整体策略 | 分里程碑 M1 → M2 → M3a → M3b |
| M1 深度 | 切片体验闭环（非最小演示、非 PRD 交互全量） |
| 质量闸门 | 软提示后可强制导出 |
| 导师形态 | 步骤脚本 + 报告/判断页受限提问 |
| 里程碑顺序 | 先微信闭环，后真 AI |
| PRO 权益 | 可点可用并扣减 |
| 引用 | 只读可见（脚注 / 抽屉） |
| 能力报告 | 真实聚合计数 |
| M2 范围 | 登录 + 支付 + 小程序壳 + 合规「我的」 |
| M3 范围 | 先模型网关，再搜索快照 + COS |
| 排除项 | 分享 / 复制 / 语音 / 多模板 / 拖拽矩阵 / IndexedDB / 独立 export-worker / 后台 / 自动退款 |
| 文档结构 | 总路线图 + 仅深挖 M1 实施计划 |
| M1 实施路径 | 风险优先 |

---

## 7. 下一步

1. 用户审阅本规格  
2. 通过后调用 **writing-plans** 产出 `docs/superpowers/plans/2026-08-11-stepdone-m1-slice-polish.md`（仅 M1 任务级）  
3. M0：将当前未提交基线改动单独整理提交（若尚未入库）  
4. 按风险优先顺序执行 M1  
