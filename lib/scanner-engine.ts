import { URL } from 'url';

export interface AuditFinding {
  finding_code: string;
  title: string;
  vulnerability_class: string;
  severity: 'High' | 'Medium' | 'Low';
  endpoint: string;
  explanation: string;
  evidence: Record<string, unknown>;
  reproduction: string;
  recommendation: string;
}

export interface AuditResult {
  targetId: string;
  targetBaseUrl: string;
  durationSeconds: number;
  totalFindings: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  findings: AuditFinding[];
}

/**
 * Real-time Active Security Audit Engine for SentinelAPI
 * Performs non-destructive, non-denial-of-service security probes against verified targets.
 */
export async function runSecurityAudit(target: {
  id: string;
  baseUrl: string;
  specUrl?: string | null;
}): Promise<AuditResult> {
  const startTime = Date.now();
  const findings: AuditFinding[] = [];
  const normalizedBase = target.baseUrl.replace(/\/$/, '');
  const targetUrl = new URL(normalizedBase);

  // 0. Cloud Warm-up Phase (Handles Render / Vercel free-tier spin up delays)
  let serverReachable = false;
  try {
    const warmUpRes = await fetch(normalizedBase, {
      method: 'GET',
      headers: { 'User-Agent': 'SentinelAPI-Warmup/1.0' },
      signal: AbortSignal.timeout(25000),
    });
    serverReachable = warmUpRes.status > 0;
  } catch {
    // Retry once in case of spin-up latency
    try {
      const retryRes = await fetch(normalizedBase, {
        method: 'GET',
        headers: { 'User-Agent': 'SentinelAPI-Warmup-Retry/1.0' },
        signal: AbortSignal.timeout(20000),
      });
      serverReachable = retryRes.status > 0;
    } catch {
      serverReachable = false;
    }
  }

  // 1. Check: Insecure Transport Layer (HTTP vs HTTPS)
  if (targetUrl.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(targetUrl.hostname)) {
    findings.push({
      finding_code: 'SENTINEL-TRANS-01',
      title: 'Cleartext Transport (Plain HTTP in Production)',
      vulnerability_class: 'Insecure Communication Channel',
      severity: 'High',
      endpoint: normalizedBase,
      explanation: 'Target endpoint communicates over unencrypted HTTP. All authentication tokens, API payloads, and query parameters can be intercepted or modified in transit by network adversaries.',
      evidence: {
        protocol: targetUrl.protocol,
        insecure_url: normalizedBase,
      },
      reproduction: `curl -I "${normalizedBase}"`,
      recommendation: 'Enforce HTTPS everywhere with an immediate 301/308 redirect from HTTP to HTTPS and provision an SSL/TLS certificate.',
    });
  }

  // 2. Base probe for Security Headers
  try {
    const headRes = await fetch(normalizedBase, {
      method: 'GET',
      headers: {
        'User-Agent': 'SentinelAPI-Security-Audit/1.0',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    const headers = headRes.headers;
    const hsts = headers.get('strict-transport-security');
    const xContentType = headers.get('x-content-type-options');
    const xFrameOptions = headers.get('x-frame-options');
    const serverHeader = headers.get('server');
    const poweredBy = headers.get('x-powered-by');

    // Missing HSTS (Only relevant for HTTPS targets)
    if (targetUrl.protocol === 'https:' && !hsts) {
      findings.push({
        finding_code: 'SENTINEL-HDR-HSTS',
        title: 'Missing HTTP Strict Transport Security (HSTS)',
        vulnerability_class: 'Transport Layer Misconfiguration',
        severity: 'Medium',
        endpoint: normalizedBase,
        explanation: 'The API target does not declare a Strict-Transport-Security header. Browsers and API clients may degrade to insecure cleartext HTTP on initial connection, leaving endpoints vulnerable to SSL stripping.',
        evidence: {
          strict_transport_security_header: null,
          http_status: headRes.status,
        },
        reproduction: `curl -s -I "${normalizedBase}" | grep -i strict-transport-security`,
        recommendation: 'Configure your web server or edge CDN to send: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload"',
      });
    }

    // Missing X-Content-Type-Options
    if (!xContentType || xContentType.toLowerCase() !== 'nosniff') {
      findings.push({
        finding_code: 'SENTINEL-HDR-NOSNIFF',
        title: 'Missing MIME-Sniffing Protection (X-Content-Type-Options)',
        vulnerability_class: 'Security Header Misconfiguration',
        severity: 'Low',
        endpoint: normalizedBase,
        explanation: 'The API response does not contain "X-Content-Type-Options: nosniff". Clients may execute content based on MIME sniffing instead of the declared content type.',
        evidence: {
          x_content_type_options: xContentType || 'NOT_PRESENT',
        },
        reproduction: `curl -s -I "${normalizedBase}" | grep -i x-content-type-options`,
        recommendation: 'Add the header "X-Content-Type-Options: nosniff" to all incoming and outgoing API responses.',
      });
    }

    // Technology Fingerprint Leakage
    if (poweredBy || (serverHeader && /\d+\.\d+/.test(serverHeader))) {
      findings.push({
        finding_code: 'SENTINEL-INFO-FINGERPRINT',
        title: 'Server Technology Stack Fingerprint Disclosed',
        vulnerability_class: 'Excessive Information Disclosure',
        severity: 'Low',
        endpoint: normalizedBase,
        explanation: 'The server leaks underlying platform software or version metadata via "Server" or "X-Powered-By" headers, aiding automated reconnaissance and CVE targeting.',
        evidence: {
          x_powered_by: poweredBy || null,
          server: serverHeader || null,
        },
        reproduction: `curl -s -I "${normalizedBase}" | grep -Ei "(server|x-powered-by)"`,
        recommendation: 'Suppress verbose fingerprinting headers in your web server or Next.js/Express framework (e.g. app.disable("x-powered-by")).',
      });
    }
  } catch (err: unknown) {
    console.warn('Base header probe warning:', err instanceof Error ? err.message : err);
  }

  // 3. Check: Cross-Origin Resource Sharing (CORS) Audit
  try {
    const corsRes = await fetch(normalizedBase, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil-attacker.sentinelapi.audit',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type',
      },
      signal: AbortSignal.timeout(12000),
    });

    const acao = corsRes.headers.get('access-control-allow-origin');
    const acac = corsRes.headers.get('access-control-allow-credentials');

    if (acao === '*' && acac === 'true') {
      findings.push({
        finding_code: 'SENTINEL-CORS-CRITICAL',
        title: 'Dangerous CORS Configuration: Wildcard with Credentials',
        vulnerability_class: 'Cross-Origin Resource Sharing (CORS) Flaw',
        severity: 'High',
        endpoint: normalizedBase,
        explanation: 'The server specifies Access-Control-Allow-Origin: * in combination with Access-Control-Allow-Credentials: true. In browsers, this configuration is either rejected or risks cross-origin credential theft.',
        evidence: {
          access_control_allow_origin: acao,
          access_control_allow_credentials: acac,
        },
        reproduction: `curl -I -X OPTIONS "${normalizedBase}" -H "Origin: https://evil-attacker.sentinelapi.audit" -H "Access-Control-Request-Method: GET"`,
        recommendation: 'Explicitly validate the Origin header against a trusted domain allowlist. Never use wildcard origins when credentials are included.',
      });
    } else if (acao === 'https://evil-attacker.sentinelapi.audit') {
      findings.push({
        finding_code: 'SENTINEL-CORS-REFLECT',
        title: 'Arbitrary Origin Reflection in CORS Headers',
        vulnerability_class: 'Cross-Origin Resource Sharing (CORS) Flaw',
        severity: 'High',
        endpoint: normalizedBase,
        explanation: 'The server blindly echoes back untrusted Origin values in Access-Control-Allow-Origin without allowlist verification.',
        evidence: {
          reflected_origin: acao,
          credentials_allowed: acac === 'true',
        },
        reproduction: `curl -I -X OPTIONS "${normalizedBase}" -H "Origin: https://evil-attacker.sentinelapi.audit"`,
        recommendation: 'Implement a strict allowlist of allowed domains rather than reflecting the client-supplied Origin header.',
      });
    }
  } catch {
    // Non-fatal CORS error
  }

  // 4. Check: Sensitive File Probing
  const sensitiveFiles = [
    {
      path: '/.env',
      code: 'SENTINEL-LEAK-ENV',
      title: 'Publicly Exposed Environment Variables (.env)',
      severity: 'High' as const,
      check: (txt: string) => /(?:DB_|SECRET|PASSWORD|KEY=|SUPABASE|AWS_)/i.test(txt),
    },
    {
      path: '/.git/HEAD',
      code: 'SENTINEL-LEAK-GIT',
      title: 'Publicly Accessible Git Repository (.git/HEAD)',
      severity: 'High' as const,
      check: (txt: string) => txt.includes('ref: refs/heads/'),
    },
  ];

  for (const item of sensitiveFiles) {
    try {
      const probeUrl = `${normalizedBase}${item.path}`;
      const probeRes = await fetch(probeUrl, {
        headers: { 'User-Agent': 'SentinelAPI-Security-Audit/1.0' },
        signal: AbortSignal.timeout(8000),
      });

      if (probeRes.ok) {
        const bodySnippet = await probeRes.text();
        if (item.check(bodySnippet)) {
          findings.push({
            finding_code: item.code,
            title: item.title,
            vulnerability_class: 'Sensitive Data Exposure',
            severity: item.severity,
            endpoint: probeUrl,
            explanation: `The file at ${item.path} is directly accessible over the public internet, exposing proprietary secrets or source code history to adversaries.`,
            evidence: {
              status: probeRes.status,
              content_length: bodySnippet.length,
              snippet_preview: bodySnippet.slice(0, 100),
            },
            reproduction: `curl -s "${probeUrl}" | head -n 10`,
            recommendation: `Configure web server deny rules (e.g. in vercel.json, nginx.conf, or .htaccess) to block all access to dotfiles and sensitive paths like ${item.path}.`,
          });
        }
      }
    } catch {
      // Endpoint unreachable
    }
  }

  // 5. Check: Rate Limiting & DoS Throttling Assessment
  try {
    const burstCount = 12;
    const burstPromises = Array.from({ length: burstCount }).map(() =>
      fetch(normalizedBase, {
        method: 'GET',
        headers: {
          'User-Agent': 'SentinelAPI-RateLimit-Assessment/1.0',
          'X-Forwarded-For': '198.51.100.42',
        },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null)
    );

    const burstResponses = (await Promise.all(burstPromises)).filter((r): r is Response => r !== null);
    const has429 = burstResponses.some((r) => r.status === 429);
    const hasRateLimitHeader = burstResponses.some((r) =>
      r.headers.has('x-ratelimit-remaining') ||
      r.headers.has('ratelimit-remaining') ||
      r.headers.has('retry-after')
    );

    if (!has429 && !hasRateLimitHeader && burstResponses.length >= 6) {
      findings.push({
        finding_code: 'SENTINEL-RATE-01',
        title: 'Unbounded API Rate Limit (Missing 429 Throttling)',
        vulnerability_class: 'Broken Rate Limiting / Resource Consumption',
        severity: 'Medium',
        endpoint: normalizedBase,
        explanation: `Target accepted a concurrent burst of ${burstResponses.length} requests without triggering HTTP 429 (Too Many Requests) or returning RFC 6585 rate limiting telemetry headers.`,
        evidence: {
          burst_requests_sent: burstCount,
          burst_requests_succeeded: burstResponses.length,
          rate_limit_headers_present: false,
          http_429_observed: false,
        },
        reproduction: `seq 1 15 | xargs -n1 -P10 curl -s -o /dev/null -w "%{http_code}\\n" "${normalizedBase}"`,
        recommendation: 'Implement token bucket or sliding-window rate limiting (e.g. using @upstash/ratelimit, Redis, Cloudflare Rate Limiting, or Express rate-limit middleware).',
      });
    }
  } catch {
    // Burst test error
  }

  // 6. Check: OpenAPI Specification Analysis (if specUrl is provided or discovered)
  const candidateSpecUrl =
    target.specUrl && (target.specUrl.startsWith('http://') || target.specUrl.startsWith('https://'))
      ? target.specUrl
      : `${normalizedBase}/openapi.json`;

  try {
    const specRes = await fetch(candidateSpecUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (specRes.ok) {
      const specData = await specRes.json();
      if (specData && typeof specData === 'object' && specData.paths) {
        const paths = Object.keys(specData.paths);

        // Check for BOLA / IDOR Candidates (paths with {id}, {userId}, {investigator_id}, {case_id}, etc.)
        const bolaPaths = paths.filter((p) =>
          /\{[^}]*(id|uuid|key|user|account|case|entity|doc|investigator|address)[^}]*\}/i.test(p)
        );
        if (bolaPaths.length > 0) {
          const samplePath = bolaPaths[0];
          findings.push({
            finding_code: 'SENTINEL-BOLA-ANALYSIS',
            title: `BOLA / IDOR Vulnerability Candidate at ${samplePath}`,
            vulnerability_class: 'Broken Object Level Authorization (BOLA / IDOR)',
            severity: 'High',
            endpoint: `${normalizedBase}${samplePath}`,
            explanation: `OpenAPI specification exposes entity reference identifiers in path parameters (${bolaPaths.slice(0, 3).join(', ')}). Without tenant/user ownership validation at the data layer, adversaries can enumerate sequential IDs to access victim records.`,
            evidence: {
              candidate_paths_detected: bolaPaths.slice(0, 5),
              total_bola_candidates: bolaPaths.length,
            },
            reproduction: `curl -X GET "${normalizedBase}${samplePath.replace(/\{[^}]+\}/, '1')}" -H "Authorization: Bearer <TEST_TOKEN>"`,
            recommendation: 'Verify tenant/user ownership on every database query: ensure query conditions include WHERE id = :id AND tenant_id = :current_tenant.',
          });
        }

        // Check for Unauthenticated Mutating Routes (POST/PUT/DELETE lacking security)
        const unauthMutating: string[] = [];
        for (const [pathStr, pathItem] of Object.entries(specData.paths)) {
          if (typeof pathItem === 'object' && pathItem !== null) {
            for (const [method, operation] of Object.entries(pathItem)) {
              if (['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
                const op = operation as { security?: unknown[] };
                if (op.security && Array.isArray(op.security) && op.security.length === 0) {
                  unauthMutating.push(`${method.toUpperCase()} ${pathStr}`);
                }
              }
            }
          }
        }

        if (unauthMutating.length > 0) {
          findings.push({
            finding_code: 'SENTINEL-AUTH-OPEN',
            title: 'Unprotected State-Mutating Endpoints Declared in OpenAPI Spec',
            vulnerability_class: 'Broken Authentication',
            severity: 'High',
            endpoint: unauthMutating[0],
            explanation: `OpenAPI specification defines mutating endpoints with explicitly empty security requirements ("security: []"): ${unauthMutating.slice(0, 3).join(', ')}.`,
            evidence: {
              unprotected_routes: unauthMutating.slice(0, 5),
            },
            reproduction: `curl -X ${unauthMutating[0].split(' ')[0]} "${normalizedBase}${unauthMutating[0].split(' ')[1]}"`,
            recommendation: 'Require cryptographic authentication (JWT / OAuth2 / API Key) on all state-mutating API routes.',
          });
        }
      }
    }
  } catch {
    // Spec URL not accessible
  }

  const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));
  const highCount = findings.filter((f) => f.severity === 'High').length;
  const mediumCount = findings.filter((f) => f.severity === 'Medium').length;
  const lowCount = findings.filter((f) => f.severity === 'Low').length;

  return {
    targetId: target.id,
    targetBaseUrl: normalizedBase,
    durationSeconds,
    totalFindings: findings.length,
    highCount,
    mediumCount,
    lowCount,
    findings,
  };
}
