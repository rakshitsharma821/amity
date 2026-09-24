const ownerFieldPattern = /(owner|user|tenant|account|customer)(Id|_id)$/i;
const idFieldPattern = /^(id|[^.]+Id|[^.]+_id)$/i;
export function findObject(body: unknown, objectId: string): Record<string, unknown> | undefined {
  if (Array.isArray(body)) for (const item of body) { const match = findObject(item, objectId); if (match) return match; }
  if (!body || typeof body !== 'object') return undefined;
  const record = body as Record<string, unknown>;
  if (Object.entries(record).some(([key, value]) => idFieldPattern.test(key) && String(value) === objectId)) return record;
  for (const value of Object.values(record)) { const match = findObject(value, objectId); if (match) return match; }
  return undefined;
}
export function validateOwnership(body: unknown, objectId: string, victimId: string) {
  const object = findObject(body, objectId);
  if (!object) return { confirmed: false, object, ownerId: undefined as string | undefined, ownerField: undefined as string | undefined };
  const pair = Object.entries(object).find(([key]) => ownerFieldPattern.test(key));
  const ownerId = pair ? String(pair[1]) : undefined;
  return { confirmed: ownerId !== undefined && ownerId === victimId, object, ownerId, ownerField: pair?.[0] };
}
