const sensitiveKey = /(password|passwd|secret|token|authorization|api.?key|card|cvv|ssn|phone|address|email|metadata)/i;
export function sanitizeEvidence(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((entry) => sanitizeEvidence(entry, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeEvidence(v, k)]));
  if (typeof value === 'string' && sensitiveKey.test(key)) return value.length > 7 ? `${value.slice(0, 3)}…[redacted]…${value.slice(-2)}` : '[redacted]';
  return value;
}
export function responseBody(response: unknown) { return sanitizeEvidence(response); }
