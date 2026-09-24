import type { Endpoint, GraphEdge, GraphNode, Relationship, Resource } from '../models/types.js';
export function buildGraph(endpoints: Endpoint[], resources: Resource[], relationships: Relationship[], identities: Array<{ id: string; role: string }>, accessed: Array<{ identityId: string; resourceId: string; objectId: string; unauthorized?: boolean; sensitiveFields?: string[] }>) {
  const nodes = new Map<string, GraphNode>(); const edges = new Map<string, GraphEdge>();
  const addNode = (node: GraphNode) => nodes.set(node.id, node);
  const addEdge = (edge: GraphEdge) => edges.set(`${edge.source}:${edge.type}:${edge.target}`, edge);
  for (const identity of identities) { addNode({ id: `identity:${identity.id}`, type: 'IDENTITY', label: identity.id }); addNode({ id: `role:${identity.role}`, type: 'ROLE', label: identity.role }); addEdge({ source: `identity:${identity.id}`, target: `role:${identity.role}`, type: 'OWNS' }); }
  for (const endpoint of endpoints) addNode({ id: `endpoint:${endpoint.id}`, type: 'ENDPOINT', label: endpoint.id, properties: { authenticationRequired: endpoint.authenticationRequired } });
  for (const resource of resources) addNode({ id: `resource:${resource.id}`, type: 'RESOURCE', label: resource.name, properties: { sensitiveFields: resource.sensitiveFields } });
  for (const relationship of relationships) if (relationship.sourceResource !== relationship.targetResource) addEdge({ source: `resource:${relationship.sourceResource}`, target: `resource:${relationship.targetResource}`, type: 'REFERENCES', label: `${relationship.identifierMapping} (${relationship.confidence})` });
  for (const endpoint of endpoints) { const firstSegment = endpoint.path.split('/').filter(Boolean).find((s) => !s.startsWith('{'))?.replace(/s$/, '').toLowerCase(); if (firstSegment && resources.some((r) => r.id === firstSegment)) addEdge({ source: `endpoint:${endpoint.id}`, target: `resource:${firstSegment}`, type: 'RETURNS' }); }
  for (const access of accessed) {
    const objectId = `object:${access.resourceId}:${access.objectId}`;
    addNode({ id: objectId, type: 'OBJECT', label: `${access.resourceId} ${access.objectId}` });
    addEdge({ source: `identity:${access.identityId}`, target: objectId, type: access.unauthorized ? 'UNAUTHORIZED_ACCESS' : 'CAN_ACCESS' });
    if (access.sensitiveFields?.length) for (const field of access.sensitiveFields) { const dataId = `data:${objectId}:${field}`; addNode({ id: dataId, type: 'SENSITIVE_DATA', label: field }); addEdge({ source: objectId, target: dataId, type: 'RETURNS' }); }
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
