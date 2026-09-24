import type { Relationship } from '../models/types.js';

export function traverseObservedRelationships(start: string, relationships: Relationship[], observedResources: Set<string>) {
  const queue: Array<{ resourceId: string; path: string[] }> = [{ resourceId: start, path: [start] }];
  const paths = new Map<string, string[]>();
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of relationships.filter((item) => item.sourceResource === current.resourceId && observedResources.has(item.targetResource))) {
      if (paths.has(edge.targetResource) || current.path.length >= 6) continue;
      const path = [...current.path, edge.targetResource]; paths.set(edge.targetResource, path); queue.push({ resourceId: edge.targetResource, path });
    }
  }
  return [...paths.entries()].map(([resourceId, path]) => ({ resourceId, path, depth: path.length - 1 }));
}
