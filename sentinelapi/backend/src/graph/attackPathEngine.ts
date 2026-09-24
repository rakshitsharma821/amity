import type { AttackPath, GraphEdge, GraphNode } from '../models/types.js';

export function buildAttackPath(input: { id: string; entryPoint: string; attacker: string; rootResource: string; rootObject: string; downstream: Array<{ resourceId: string; objectId: string }>; sensitiveData: string[]; evidenceIds: string[] }): AttackPath {
  const root = { nodeId: `object:${input.rootResource}:${input.rootObject}`, label: `${input.rootResource} ${input.rootObject}`, relationship: 'UNAUTHORIZED_ACCESS' };
  const branches = input.downstream.map((item) => ({ resourceId: item.resourceId, objectId: item.objectId, steps: [root, { nodeId: `object:${item.resourceId}:${item.objectId}`, label: `${item.resourceId} ${item.objectId}`, relationship: 'REFERENCES' }], depth: 2 }));
  const steps = [
    { nodeId: `identity:${input.attacker}`, label: input.attacker, relationship: 'ATTACKER' },
    root,
    ...(branches[0] ? [branches[0].steps[1]] : []),
  ];
  return { id: input.id, entryPoint: input.entryPoint, attacker: input.attacker, steps, branches, affectedResources: [input.rootResource, ...input.downstream.map((item) => item.resourceId)], sensitiveData: input.sensitiveData, depth: Math.max(steps.length - 1, ...branches.map((branch) => branch.depth)), evidenceIds: input.evidenceIds };
}

export function attackPathGraph(path: AttackPath): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const pathSteps = [...path.steps, ...(path.branches ?? []).flatMap((branch) => branch.steps.slice(1))];
  const nodeMap = new Map(pathSteps.map((step, index): [string, GraphNode] => [step.nodeId, { id: step.nodeId, type: step.nodeId.startsWith('identity:') ? 'IDENTITY' : 'OBJECT', label: step.label }]));
  const edges: GraphEdge[] = path.steps.slice(1).map((step, index): GraphEdge => ({ source: path.steps[index].nodeId, target: step.nodeId, type: index === 0 ? 'UNAUTHORIZED_ACCESS' : step.relationship === 'REFERENCES' ? 'REFERENCES' : 'LEADS_TO', label: step.relationship }));
  for (const branch of path.branches ?? []) edges.push({ source: branch.steps[0].nodeId, target: branch.steps[1].nodeId, type: 'REFERENCES', label: branch.steps[1].relationship });
  return { nodes: [...nodeMap.values()], edges };
}
