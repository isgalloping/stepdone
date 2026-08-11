"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import {
  isMentorStepKey,
  type MentorQuestion,
  type MentorStepKey,
} from "@/lib/mentor/scripts";
import { isMentorAskStep, type MentorAskIntent } from "@/lib/mentor/intents";

type MentorState = {
  done: boolean;
  question: MentorQuestion | null;
};

const ASK_ACTIONS: Array<{ intent: MentorAskIntent; label: string }> = [
  { intent: "rewrite", label: "改写更克制" },
  { intent: "shorten", label: "缩短表述" },
  { intent: "explain_source", label: "核对来源" },
];

export function MentorPanel({
  projectId,
  step,
  tip,
  getSelection,
  onSuggestion,
}: {
  projectId: string;
  step: string;
  tip?: React.ReactNode;
  getSelection?: () => string;
  onSuggestion?: (suggestion: string | null) => void;
}) {
  const validStep = isMentorStepKey(step);
  const mentorStep: MentorStepKey = validStep ? step : "plan";
  const [state, setState] = useState<MentorState>({
    done: false,
    question: null,
  });
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const load = useCallback(async () => {
    if (!validStep) {
      setState({ done: true, question: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await api<MentorState & { step: string }>(
      `/api/projects/${projectId}/mentor?step=${encodeURIComponent(mentorStep)}`,
    );
    if (res.success) {
      setState({ done: res.data.done, question: res.data.question });
    } else {
      setState({ done: true, question: null });
    }
    setLoading(false);
  }, [projectId, mentorStep, validStep]);

  useEffect(() => {
    void load();
    setSuggestion(null);
    onSuggestion?.(null);
  }, [load, onSuggestion]);

  async function answer(optionId: string) {
    if (!state.question || answering) return;
    setAnswering(true);
    const res = await api<{
      next: MentorQuestion | null;
      done: boolean;
    }>(`/api/projects/${projectId}/mentor/answer`, {
      method: "POST",
      body: JSON.stringify({
        step: mentorStep,
        questionId: state.question.id,
        optionId,
      }),
    });
    setAnswering(false);
    if (res.success) {
      setState({ done: res.data.done, question: res.data.next });
    }
  }

  async function ask(intent: MentorAskIntent) {
    if (asking) return;
    setAsking(true);
    setSuggestion(null);
    onSuggestion?.(null);
    const selection =
      getSelection?.() ??
      (typeof window !== "undefined"
        ? (window.getSelection()?.toString() ?? "")
        : "");
    const res = await api<{ suggestion: string }>(
      `/api/projects/${projectId}/mentor/ask`,
      {
        method: "POST",
        body: JSON.stringify({ intent, step: mentorStep, selection }),
      },
    );
    setAsking(false);
    if (res.success) {
      setSuggestion(res.data.suggestion);
      onSuggestion?.(res.data.suggestion);
    }
  }

  const showAsk = isMentorAskStep(mentorStep);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {loading ? (
        <p className="sd-muted" style={{ fontSize: 13 }}>
          导师准备中…
        </p>
      ) : state.done || !state.question ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p className="sd-muted" style={{ margin: 0, fontSize: 14 }}>
            本步引导已完成。
          </p>
          {tip ?? (
            <p className="sd-muted" style={{ margin: 0 }}>
              一次只提出一个关键问题，帮你做成可交付成果。
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.45 }}>
            {state.question.question}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {state.question.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="sd-btn sd-btn-secondary"
                data-testid="mentor-option"
                disabled={answering}
                style={{ justifyContent: "flex-start", textAlign: "left" }}
                onClick={() => void answer(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAsk ? (
        <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
          <div className="sd-muted" style={{ fontSize: 12 }}>
            受限追问（判断 / 报告）
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ASK_ACTIONS.map((a) => (
              <button
                key={a.intent}
                type="button"
                className="sd-btn sd-btn-secondary"
                style={{ minHeight: 32, fontSize: 12, padding: "0 10px" }}
                disabled={asking}
                onClick={() => void ask(a.intent)}
              >
                {a.label}
              </button>
            ))}
          </div>
          {suggestion ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                padding: "0.6rem 0.7rem",
                background: "var(--sd-bg)",
                borderRadius: 8,
              }}
            >
              {suggestion}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
