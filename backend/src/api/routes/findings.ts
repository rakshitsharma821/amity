import { Router } from 'express';
import { store } from '../../db/database.js';
export const findingsRouter = Router();
function find(id: string) { for (const scan of store.listScans()) { const finding = scan.findings?.find((item) => item.id === id); if (finding) return { scan, finding }; } return undefined; }
findingsRouter.get('/:id', (req, res) => { const value = find(req.params.id); if (!value) return res.status(404).json({ error: 'Finding not found' }); const { evidence: _evidence, ...finding } = value.finding; return res.json({ finding }); });
findingsRouter.get('/:id/evidence', (req, res) => { const value = find(req.params.id); return value ? res.json({ evidence: value.finding.evidence }) : res.status(404).json({ error: 'Finding not found' }); });
findingsRouter.get('/:id/attack-path', (req, res) => { const value = find(req.params.id); if (!value) return res.status(404).json({ error: 'Finding not found' }); return res.json({ attackPath: value.scan.attackPaths?.find((path) => path.id === value.finding.attackPathId) ?? null }); });
