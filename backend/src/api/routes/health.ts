import { Router } from 'express';
import { env } from '../../config/env.js';
export const healthRouter = Router();
healthRouter.get('/', (_req, res) => res.json({ status: 'ok', service: 'sentinelapi-backend', safeSandboxMode: env.authorizedTargetHosts.size === 0, allowedRemoteHosts: env.authorizedTargetHosts.size, timestamp: new Date().toISOString() }));
