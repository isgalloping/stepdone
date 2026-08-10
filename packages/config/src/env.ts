import { z } from "zod";

const EnvSchema = z.object({
  APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  MOCK_PAYMENTS: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
  FIELD_ENCRYPTION_KEY: z.string().min(16).optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function mockPaymentsAllowed(env: AppEnv = loadEnv()): boolean {
  return env.MOCK_PAYMENTS || env.APP_ENV !== "production";
}
