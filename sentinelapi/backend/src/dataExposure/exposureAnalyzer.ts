import type { Resource } from '../models/types.js';

const sensitivePattern = /(password|passwd|secret|token|card|cvv|ssn|phone|address|email|internal|metadata)/i;
export function analyzeExposure(body: unknown, resource?: Resource) {
  const observed = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { observed.add(key); visit(child); }
  };
  visit(body);
  const exposedFields = [...observed].filter((field) => sensitivePattern.test(field) || resource?.sensitiveFields.includes(field));
  return { exposedFields, observedFields: [...observed], schemaSensitiveFields: resource?.sensitiveFields.filter((field) => observed.has(field)) ?? [] };
}
