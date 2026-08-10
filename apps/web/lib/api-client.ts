export type ApiResult<T> =
  | { success: true; data: T; requestId: string }
  | {
      success: false;
      error: { code: string; message: string; retryable?: boolean };
      requestId: string;
    };

export async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return (await res.json()) as ApiResult<T>;
}
