"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () =>
      api<{
        publicId: string;
        title: string;
        status: string;
        currentStepCode: string | null;
        progress: number;
        revision: number;
        metadata: unknown;
      }>(`/api/projects/${projectId}`),
    refetchInterval: 3000,
  });
}

export function useProjectSteps(projectId: string) {
  return useQuery({
    queryKey: ["project-steps", projectId],
    queryFn: async () =>
      api<{
        runs: Array<{
          publicId: string;
          nodeCode: string;
          status: string;
          output: unknown;
        }>;
      }>(`/api/projects/${projectId}/steps`),
    refetchInterval: 2000,
  });
}

export function useProjectStatus(projectId: string) {
  return useQuery({
    queryKey: ["project-status", projectId],
    queryFn: async () =>
      api<{
        status: string;
        currentStepCode: string | null;
        progress: number;
        latestEvent: { message: string; stage: string } | null;
      }>(`/api/projects/${projectId}/status`),
    refetchInterval: 2000,
  });
}
