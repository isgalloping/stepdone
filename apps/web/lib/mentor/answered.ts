import { prisma } from "@stepdone/database";
import type { MentorStepKey } from "@stepdone/domain";

type MentorPayload = {
  step?: string;
  questionId?: string;
  optionId?: string;
};

export async function answeredQuestionIds(
  projectId: bigint,
  step: MentorStepKey,
): Promise<string[]> {
  const rows = await prisma.projectDecision.findMany({
    where: {
      projectId,
      action: "MENTOR_ANSWER",
    },
    orderBy: { createdAt: "asc" },
  });

  const ids: string[] = [];
  for (const row of rows) {
    const payload = (row.payload ?? {}) as MentorPayload;
    if (payload.step === step && typeof payload.questionId === "string") {
      ids.push(payload.questionId);
    }
  }
  return ids;
}
