import type { Endpoint } from '../../models/types.js';
export function discoverEndpoints(endpoints: Endpoint[]) { return endpoints.filter((endpoint) => endpoint.method !== 'delete'); }
