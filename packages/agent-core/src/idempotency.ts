export function buildIdempotencyKey(
  projectId: string,
  stepRunId: string,
  nodeCode: string,
  inputVersion: number,
): string {
  return `${projectId}:${stepRunId}:${nodeCode}:${inputVersion}`;
}
