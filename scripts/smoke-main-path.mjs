#!/usr/bin/env node
/**
 * Slice A API smoke: login → create project → decisions → preview → mock pay → report
 * Requires: docker up, db seeded, `pnpm --filter @stepdone/web dev`, `pnpm --filter @stepdone/agent-worker dev`
 */

const BASE = process.env.APP_URL ?? "http://localhost:3000";

function parseSetCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = res.headers.get("set-cookie");
  return single ? single.split(";")[0] : "";
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = parseSetCookie(res);
  const json = await res.json();
  return { res, json, setCookie };
}

async function waitFor(predicate, label, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await predicate();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${label}`);
}

const objective = {
  title: "智能协作套件竞品分析",
  analysisTarget: "飞书",
  useCase: "向老板汇报",
  audience: "直属领导",
  markets: ["中国大陆"],
  deadline: "一周内",
  outputFormats: ["PDF", "在线报告"],
  knownCompetitors: ["钉钉", "企业微信"],
  notes: "smoke test",
};

async function main() {
  console.log("smoke against", BASE);

  const login = await api("/api/auth/mock-login", { method: "POST", body: {} });
  if (!login.json.success) throw new Error(`login failed: ${JSON.stringify(login.json)}`);
  let cookie = login.setCookie;
  if (!cookie) throw new Error("no session cookie");
  console.log("LOGIN_OK", login.json.data.user.publicId);

  const created = await api("/api/projects", {
    method: "POST",
    body: objective,
    cookie,
  });
  if (!created.json.success) throw new Error(`create failed: ${JSON.stringify(created.json)}`);
  const projectId = created.json.data.projectId;
  console.log("PROJECT_OK", projectId);

  await waitFor(async () => {
    const steps = await api(`/api/projects/${projectId}/steps`, { cookie });
    const plan = steps.json.data?.runs?.find((r) => r.nodeCode === "CREATE_PLAN");
    return plan?.status === "WAITING_USER" ? plan : null;
  }, "CREATE_PLAN waiting_user");
  console.log("PLAN_READY");

  let d = await api(`/api/projects/${projectId}/steps/CREATE_PLAN/decision`, {
    method: "POST",
    cookie,
    body: { action: "CONFIRM_PLAN" },
  });
  if (!d.json.success) throw new Error(JSON.stringify(d.json));

  await waitFor(async () => {
    const steps = await api(`/api/projects/${projectId}/steps`, { cookie });
    const run = steps.json.data?.runs?.find((r) => r.nodeCode === "SELECT_COMPETITORS");
    return run?.status === "WAITING_USER" ? run : null;
  }, "SELECT_COMPETITORS");
  console.log("COMPETITORS_READY");

  d = await api(`/api/projects/${projectId}/steps/SELECT_COMPETITORS/decision`, {
    method: "POST",
    cookie,
    body: {
      action: "CONFIRM_COMPETITORS",
      payload: { names: ["飞书", "竞品 Alpha", "竞品 Beta"] },
    },
  });
  if (!d.json.success) throw new Error(JSON.stringify(d.json));

  await waitFor(async () => {
    const steps = await api(`/api/projects/${projectId}/steps`, { cookie });
    const run = steps.json.data?.runs?.find((r) => r.nodeCode === "RESEARCH_SOURCES");
    return run?.status === "SUCCEEDED" ? run : null;
  }, "RESEARCH_SOURCES", 90_000);
  console.log("RESEARCH_OK");

  d = await api(`/api/projects/${projectId}/steps/RESEARCH_SOURCES/decision`, {
    method: "POST",
    cookie,
    body: { action: "CONTINUE" },
  });
  if (!d.json.success) throw new Error(JSON.stringify(d.json));

  await waitFor(async () => {
    const steps = await api(`/api/projects/${projectId}/steps`, { cookie });
    const run = steps.json.data?.runs?.find((r) => r.nodeCode === "SELECT_DIMENSIONS");
    return run?.status === "WAITING_USER" ? run : null;
  }, "SELECT_DIMENSIONS");

  d = await api(`/api/projects/${projectId}/steps/SELECT_DIMENSIONS/decision`, {
    method: "POST",
    cookie,
    body: {
      action: "CONFIRM_DIMENSIONS",
      payload: {
        selected: ["产品定位", "目标用户", "核心功能", "价格"],
        important: ["核心功能", "价格"],
      },
    },
  });
  if (!d.json.success) throw new Error(JSON.stringify(d.json));

  await waitFor(async () => {
    const steps = await api(`/api/projects/${projectId}/steps`, { cookie });
    const run = steps.json.data?.runs?.find((r) => r.nodeCode === "USER_JUDGMENT");
    return run?.status === "WAITING_USER" ? run : null;
  }, "USER_JUDGMENT", 90_000);
  console.log("JUDGMENT_READY");

  d = await api(`/api/projects/${projectId}/steps/USER_JUDGMENT/decision`, {
    method: "POST",
    cookie,
    body: {
      action: "SUBMIT_JUDGMENTS",
      payload: {
        judgments: [
          { id: "j1", stance: "AGREE", finalText: "同意综合协作更完整的判断，依据公开功能列表。" },
          { id: "j2", stance: "PARTIAL", note: "获客策略需补充时效", finalText: "部分同意免费获客更激进。" },
          { id: "j3", stance: "AGREE", finalText: "同意差异主要在工作流深度。" },
        ],
      },
    },
  });
  if (!d.json.success) throw new Error(JSON.stringify(d.json));

  await waitFor(async () => {
    const status = await api(`/api/projects/${projectId}/status`, { cookie });
    return status.json.data?.status === "PAYMENT_REQUIRED" ? status.json.data : null;
  }, "PAYMENT_REQUIRED", 90_000);
  console.log("PREVIEW_OK");

  const order = await api("/api/orders", {
    method: "POST",
    cookie,
    body: { projectId, productCode: "STANDARD_PROJECT" },
  });
  if (!order.json.success) throw new Error(JSON.stringify(order.json));
  const orderPublicId = order.json.data.orderPublicId;

  const pay = await api("/api/payments/mock/confirm", {
    method: "POST",
    cookie,
    body: { orderPublicId },
  });
  if (!pay.json.success) throw new Error(JSON.stringify(pay.json));
  console.log("PAYMENT_OK");

  await waitFor(async () => {
    const arts = await api(`/api/projects/${projectId}/artifacts`, { cookie });
    const report = arts.json.data?.artifacts?.find((a) => a.type === "ONLINE_REPORT");
    return report?.content ? report : null;
  }, "ONLINE_REPORT", 90_000);
  console.log("REPORT_NODE_OK");

  const cites = await api(`/api/projects/${projectId}/citations`, { cookie });
  if (!cites.json.success || !Array.isArray(cites.json.data?.citations)) {
    throw new Error("CITATIONS_API_MISSING");
  }
  if (cites.json.data.citations.length < 1) {
    throw new Error("CITATIONS_EMPTY");
  }
  console.log("CITATIONS_OK", cites.json.data.citations.length);

  const quality = await api(`/api/projects/${projectId}/quality-check`, { cookie });
  if (!quality.json.success) {
    throw new Error(`QUALITY_API_FAIL: ${JSON.stringify(quality.json)}`);
  }
  if (!Array.isArray(quality.json.data?.issues)) {
    throw new Error("QUALITY_ISSUES_MISSING");
  }
  console.log("QUALITY_OK", quality.json.data.issues.length);

  console.log("SMOKE_PASS");
}

main().catch((error) => {
  console.error("SMOKE_FAIL", error);
  process.exit(1);
});
