import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { scanRequestSchema } from '../../models/schemas.js';
import { store } from '../../db/database.js';
import { runScan } from '../../scanner/scanEngine.js';
import type { Identity, ScanRecord } from '../../models/types.js';

export const scansRouter = Router();
scansRouter.get('/', (req, res) => res.json({ scans: store.listScans(typeof req.query.targetId === 'string' ? req.query.targetId : undefined) }));
scansRouter.post('/', (req, res) => {
  const parsed = scanRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid scan request', details: parsed.error.flatten() });
  const target = store.getTarget(parsed.data.targetId);
  if (!target) return res.status(404).json({ error: 'Target not found' });
  const identities: Identity[] = parsed.data.identities ?? target.identities;
  if (identities.length < 2 || identities.some((identity) => !identity.credentials && !identity.token)) return res.status(400).json({ error: 'Provide at least two test identities with credentials or tokens per scan. Secrets are held only in memory during execution.' });
  const scan: ScanRecord = { id: randomUUID(), targetId: target.id, status: 'CREATED', progress: 0, currentStep: 'Queued', createdAt: new Date().toISOString(), findings: [], attackPaths: [], resources: [], relationships: [], graph: { nodes: [], edges: [] } };
  store.createScan(scan);
  void runScan(scan, target, identities, parsed.data.checks);
  return res.status(202).json({ scanId: scan.id, status: scan.status, statusUrl: `/api/scans/${scan.id}/status` });
});
scansRouter.get('/:id', (req, res) => { const scan = store.getScan(req.params.id); return scan ? res.json({ scan }) : res.status(404).json({ error: 'Scan not found' }); });
scansRouter.get('/:id/status', (req, res) => { const scan = store.getScan(req.params.id); return scan ? res.json({ id: scan.id, status: scan.status, progress: scan.progress, currentStep: scan.currentStep, error: scan.error }) : res.status(404).json({ error: 'Scan not found' }); });
scansRouter.get('/:id/findings', (req, res) => { const scan = store.getScan(req.params.id); return scan ? res.json({ scanId: scan.id, findings: scan.findings ?? [] }) : res.status(404).json({ error: 'Scan not found' }); });
scansRouter.get('/:id/graph', (req, res) => { const scan = store.getScan(req.params.id); return scan ? res.json(scan.graph ?? { nodes: [], edges: [] }) : res.status(404).json({ error: 'Scan not found' }); });
scansRouter.get('/:id/report', (req, res) => { const scan = store.getScan(req.params.id); return scan ? res.json(scan.report ?? { scanId: scan.id, status: scan.status }) : res.status(404).json({ error: 'Scan not found' }); });
scansRouter.get('/:id/attack-paths', (req, res) => { const scan = store.getScan(req.params.id); return scan ? res.json({ scanId: scan.id, attackPaths: scan.attackPaths ?? [] }) : res.status(404).json({ error: 'Scan not found' }); });
