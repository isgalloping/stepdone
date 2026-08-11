import { z } from "zod";

export const PlanOutputSchema = z.object({
  goal: z.string(),
  deliverables: z.array(z.string()).min(1),
  steps: z
    .array(
      z.object({
        code: z.string(),
        title: z.string(),
        aiResponsibility: z.string(),
        userResponsibility: z.string(),
      }),
    )
    .min(6),
  estimatedMinutes: z.number().int().positive(),
});

export const CompetitorListSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string().min(1),
        website: z.string().url().optional(),
        positioning: z.string(),
        recommendationReason: z.string(),
        matchScore: z.number().min(0).max(100),
        confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
      }),
    )
    .min(3)
    .max(10),
  uncertainties: z.array(z.string()),
});

export const DimensionsOutputSchema = z.object({
  dimensions: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      }),
    )
    .min(4),
});

export const MatrixOutputSchema = z.object({
  rows: z.array(
    z.object({
      dimension: z.string(),
      cells: z.array(
        z.object({
          competitor: z.string(),
          fact: z.string(),
          conclusion: z.string(),
          confidence: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]),
        }),
      ),
    }),
  ),
});

export const PreviewOutputSchema = z.object({
  coverTitle: z.string(),
  toc: z.array(z.string()),
  summary: z.string(),
  qualityScore: z.number().min(0).max(100),
  lockedSections: z.array(z.string()),
});

export const ReportOutputSchema = z.object({
  type: z.literal("document"),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["heading", "paragraph", "table", "citation"]),
      level: z.number().optional(),
      text: z.string().optional(),
      sourceId: z.string().optional(),
    }),
  ),
});

export const QualityOutputSchema = z.object({
  scores: z.object({
    accuracy: z.number(),
    completeness: z.number(),
    logic: z.number(),
    timeliness: z.number(),
    usability: z.number(),
    expression: z.number(),
    risk: z.number(),
  }),
  issues: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
      message: z.string(),
      status: z.enum(["OPEN", "RESOLVED"]).default("OPEN"),
    }),
  ),
});
