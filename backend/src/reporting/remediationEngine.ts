const guidance: Record<string, string> = {
  BOLA: 'Enforce server-side ownership or tenant checks using the authenticated subject before returning an object. Do not trust a client-supplied object identifier as authorization.',
  DATA_EXPOSURE: 'Return a response DTO with an explicit field allowlist. Remove secrets and sensitive personal or payment fields from API responses.',
  RATE_LIMITING: 'Apply per-account and per-source rate limits. Return HTTP 429 with a Retry-After value and monitor repeated authentication failures.',
};
export function remediation(type: string) { return guidance[type] ?? 'Enforce endpoint-level authorization and return only the minimum fields required by the client.'; }
