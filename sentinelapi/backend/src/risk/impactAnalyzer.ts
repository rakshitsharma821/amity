import type { ImpactAnalysis, Relationship, Resource } from '../models/types.js';
export function analyzeImpact(resourceId: string, relationships: Relationship[], resources: Resource[], victimId: string, depth: number, reachable: string[] = []): ImpactAnalysis {
  const direct = resources.find((r) => r.id === resourceId);
  const fields = new Set(direct?.sensitiveFields ?? []);
  for (const id of reachable) for (const field of resources.find((r) => r.id === id)?.sensitiveFields ?? []) fields.add(field);
  return { directlyExposed: direct ? [direct.name] : [resourceId], indirectlyReachable: reachable.map((id) => resources.find((r) => r.id === id)?.name ?? id), sensitiveFields: [...fields], affectedIdentities: [victimId], attackPathDepth: depth, privilegeDifference: 'Same role; cross-identity object access' };
}
