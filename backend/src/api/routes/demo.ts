import { Router } from 'express';
import { store } from '../../db/database.js';
import { sandboxFetch } from '../../utils/targetSafety.js';
export const demoRouter = Router();
async function reset(req: import('express').Request, res: import('express').Response) {
  const targetId = typeof req.body?.targetId === 'string' ? req.body.targetId : '';
  const target = store.getTarget(targetId);
  if (!target?.demoSandbox || !target.sandboxMode || !['localhost', '127.0.0.1', '::1'].includes(new URL(target.baseUrl).hostname.replace(/^\[|\]$/g, '').toLowerCase())) return res.status(403).json({ error: 'Demo reset is restricted to an explicitly registered loopback demo sandbox' });
  try {
    const response = await sandboxFetch(new URL('/__demo/reset', target.baseUrl).toString(), target.baseUrl, { method: 'POST' });
    const result = await response.json();
    return res.status(response.status).json(result);
  } catch { return res.status(502).json({ error: 'Unable to reach the configured local demo API' }); }
}
demoRouter.post('/reset', reset);
demoRouter.post('/seed', reset);
