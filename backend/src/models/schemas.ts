import { z } from 'zod';

export const identitySchema = z.object({
  id: z.string().min(1).max(100), username: z.string().min(1).max(100), role: z.string().default('user'),
  credentials: z.record(z.string(), z.unknown()).optional(), token: z.string().optional(),
  ownedResources: z.record(z.string(), z.array(z.string())).optional(),
});
export const createTargetSchema = z.object({
  name: z.string().trim().min(2).max(100), baseUrl: z.string().url(), openApiUrl: z.string().url().optional(),
  openApiDocument: z.record(z.string(), z.unknown()).optional(), sandboxMode: z.boolean().default(true),
  authorized: z.boolean().default(false), demoSandbox: z.boolean().default(false), allowDestructiveTests: z.boolean().default(false), loginPath: z.string().startsWith('/').default('/login'),
  tokenJsonPath: z.string().default('token'), tokenPrefix: z.string().default('Bearer '),
  identities: z.array(identitySchema).min(1).max(10),
}).refine((value) => value.openApiUrl || value.openApiDocument, { message: 'Provide openApiUrl or openApiDocument' });
export const scanRequestSchema = z.object({ targetId: z.string().min(1), identities: z.array(identitySchema).min(1).max(10).optional(), checks: z.object({ bola: z.boolean().default(true), bfla: z.boolean().default(true), dataExposure: z.boolean().default(true), massAssignment: z.boolean().default(true), rateLimiting: z.boolean().default(false), rateLimitRequests: z.number().int().min(1).max(10).default(5) }).default({ bola: true, bfla: true, dataExposure: true, massAssignment: true, rateLimiting: false, rateLimitRequests: 5 }) });
