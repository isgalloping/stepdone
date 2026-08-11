import { describe, it, expect } from "vitest";
import { signSession, verifySession } from "./session";

describe("session tokens", () => {
  const secret = "dev-only-change-me-32chars-minimum!!";

  it("signs and verifies", () => {
    const token = signSession(
      {
        userPublicId: "user_01",
        sessionPublicId: "sess_01",
        exp: Date.now() + 60_000,
      },
      secret,
    );
    const payload = verifySession(token, secret);
    expect(payload?.userPublicId).toBe("user_01");
  });

  it("rejects tampered token", () => {
    const token = signSession(
      {
        userPublicId: "user_01",
        sessionPublicId: "sess_01",
        exp: Date.now() + 60_000,
      },
      secret,
    );
    expect(verifySession(token + "x", secret)).toBeNull();
  });
});
