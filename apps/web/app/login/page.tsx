"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { loadDraft } from "@/lib/draft";

export default function LoginPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onMockLogin() {
    if (!agreed) return;
    setLoading(true);
    setError("");
    const res = await api("/api/auth/mock-login", { method: "POST", body: "{}" });
    setLoading(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    const draft = loadDraft();
    router.push(draft ? "/projects/new?resume=1" : "/projects");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 420, margin: "3rem auto", padding: "1rem" }}>
      <div className="sd-card">
        <h1 style={{ marginTop: 0 }}>登录逐成 AI</h1>
        <p className="sd-muted">演示环境提供一键登录，正式环境将支持微信与手机验证码。</p>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "1rem 0" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 4 }}
          />
          <span>
            我已阅读并同意《用户协议》和《隐私政策》。
          </span>
        </label>
        {error ? <p style={{ color: "var(--sd-danger)" }}>{error}</p> : null}
        <button
          className="sd-btn"
          style={{ width: "100%" }}
          disabled={!agreed || loading}
          onClick={onMockLogin}
          data-testid="mock-login"
        >
          {loading ? "登录中…" : "一键演示登录"}
        </button>
      </div>
    </div>
  );
}
