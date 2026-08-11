"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

export type AutosaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "conflict"
  | "error";

type ConflictPayload = {
  localChanges: Record<string, unknown>;
  remoteRevision: number;
};

export function useAutosave(
  projectPublicId: string,
  revision: number,
  getChanges: () => Record<string, unknown>,
  enabled = true,
) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [currentRevision, setCurrentRevision] = useState(revision);
  const [conflict, setConflict] = useState<ConflictPayload | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getChangesRef = useRef(getChanges);
  getChangesRef.current = getChanges;

  useEffect(() => {
    setCurrentRevision(revision);
  }, [revision]);

  const save = useCallback(
    async (choice?: "local" | "remote") => {
      if (!enabled || !projectPublicId) return;
      const changes = getChangesRef.current();
      if (!changes || Object.keys(changes).length === 0) return;

      if (choice === "remote") {
        setConflict(null);
        setStatus("idle");
        return { action: "reload" as const };
      }

      setStatus("saving");
      const res = await api<{ revision: number }>(
        `/api/projects/${projectPublicId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            revision: currentRevision,
            changes,
          }),
        },
      );

      if (!res.success) {
        if (res.error.code === "PROJECT_REVISION_CONFLICT") {
          setStatus("conflict");
          setConflict({ localChanges: changes, remoteRevision: currentRevision });
          return { action: "conflict" as const };
        }
        setStatus("error");
        return { action: "error" as const };
      }

      setCurrentRevision(res.data.revision);
      setConflict(null);
      setStatus("saved");
      return { action: "saved" as const, revision: res.data.revision };
    },
    [currentRevision, enabled, projectPublicId],
  );

  const scheduleSave = useCallback(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save();
    }, 1000);
  }, [enabled, save]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      void save();
    }, 30_000);
    return () => clearInterval(interval);
  }, [enabled, save]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const resolveConflict = useCallback(
    async (choice: "local" | "remote") => {
      if (choice === "remote") {
        setConflict(null);
        setStatus("idle");
        return { action: "reload" as const };
      }
      // force: fetch latest revision then patch with local
      const latest = await api<{ revision: number }>(
        `/api/projects/${projectPublicId}`,
      );
      if (!latest.success) {
        setStatus("error");
        return { action: "error" as const };
      }
      setCurrentRevision(latest.data.revision);
      const res = await api<{ revision: number }>(
        `/api/projects/${projectPublicId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            revision: latest.data.revision,
            changes: conflict?.localChanges ?? getChangesRef.current(),
          }),
        },
      );
      if (!res.success) {
        setStatus("error");
        return { action: "error" as const };
      }
      setCurrentRevision(res.data.revision);
      setConflict(null);
      setStatus("saved");
      return { action: "saved" as const };
    },
    [conflict?.localChanges, projectPublicId],
  );

  return {
    status,
    currentRevision,
    conflict,
    scheduleSave,
    saveNow: save,
    resolveConflict,
  };
}
