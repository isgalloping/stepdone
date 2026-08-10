export type NodeResult<T> =
  | { type: "completed"; output: T }
  | {
      type: "waiting_user";
      prompt: { question: string; options?: string[] };
      partialOutput?: Partial<T>;
    }
  | { type: "retry"; reason: string; retryAfterMs?: number }
  | { type: "failed"; code: string; message: string };
