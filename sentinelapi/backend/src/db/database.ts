import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { ScanRecord, Target } from '../models/types.js';
import { env } from '../config/env.js';
const dbPath = resolve(env.DATABASE_PATH);
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS targets (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, target_id TEXT NOT NULL, status TEXT NOT NULL, progress INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(target_id) REFERENCES targets(id));
CREATE INDEX IF NOT EXISTS scans_target_created ON scans(target_id, created_at DESC);`);
export const store = {
  putTarget(target: Target) { db.prepare('INSERT INTO targets(id,data,created_at) VALUES(?,?,?)').run(target.id, JSON.stringify(target), target.createdAt); },
  getTarget(id: string): Target | undefined { const row = db.prepare('SELECT data FROM targets WHERE id=?').get(id) as { data: string } | undefined; return row ? JSON.parse(row.data) as Target : undefined; },
  listTargets(): Target[] { return (db.prepare('SELECT data FROM targets ORDER BY created_at DESC').all() as Array<{ data: string }>).map((r) => JSON.parse(r.data) as Target); },
  createScan(scan: ScanRecord) { db.prepare('INSERT INTO scans(id,target_id,status,progress,data,created_at) VALUES(?,?,?,?,?,?)').run(scan.id, scan.targetId, scan.status, scan.progress, JSON.stringify(scan), scan.createdAt); },
  getScan(id: string): ScanRecord | undefined { const row = db.prepare('SELECT data FROM scans WHERE id=?').get(id) as { data: string } | undefined; return row ? JSON.parse(row.data) as ScanRecord : undefined; },
  listScans(targetId?: string): ScanRecord[] { const rows = targetId ? db.prepare('SELECT data FROM scans WHERE target_id=? ORDER BY created_at DESC').all(targetId) : db.prepare('SELECT data FROM scans ORDER BY created_at DESC').all(); return (rows as Array<{ data: string }>).map((r) => JSON.parse(r.data) as ScanRecord); },
  updateScan(scan: ScanRecord) { db.prepare('UPDATE scans SET status=?, progress=?, data=? WHERE id=?').run(scan.status, scan.progress, JSON.stringify(scan), scan.id); },
  close() { db.close(); },
};
