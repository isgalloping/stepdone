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
