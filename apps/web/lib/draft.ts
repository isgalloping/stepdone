export const DRAFT_KEY = "stepdone:objective-draft";

export function saveDraft(data: unknown): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
}

export function loadDraft<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}
