# SentinelAPI backend MVP

This standalone Express service runs OpenAPI-described checks against the local vulnerable demo API or a sandbox hostname explicitly allowlisted by the operator. It uses TypeScript, Zod, SQLite (`node:sqlite`), actual HTTP requests, and an internal authorization/resource graph.

The demo target is intentionally vulnerable. Keep it on loopback. The backend also binds to `127.0.0.1` by default.

## Start locally

Use Node.js 22.13 or newer (Node 24 was used for development). From the repository root, start two terminals.

Terminal 1 — demo target:

```sh
node sentinelapi/vulnerable-api/server.js
```

The sandbox binds to `127.0.0.1:4000` and serves its OpenAPI document at `/openapi.json`.

Terminal 2 — backend:

```sh
cd sentinelapi/backend
npm install
npm run dev
```

The backend binds to `127.0.0.1:5000` and stores scan/target records in `sentinelapi/backend/data/sentinel.sqlite`.

## Run the demo scan

The committed example contains Alice/Bob demo credentials and their known owned object IDs. Credentials are sent with each scan and are not written to SQLite.

```sh
curl -s http://127.0.0.1:5000/api/health
```

Register the target (the API stores identity labels and owned IDs, not credentials):

```sh
curl -s -X POST http://127.0.0.1:5000/api/targets \
  -H 'Content-Type: application/json' \
  --data @sentinelapi/scanner/backend-demo.config.json
```

For a copyable end-to-end request, read the new target `id` from that response and submit it with both identities from `backend-demo.config.json`:

```sh
curl -s -X POST http://127.0.0.1:5000/api/scans \
  -H 'Content-Type: application/json' \
  --data '{"targetId":"<TARGET_ID>","identities":[{"id":"1","username":"alice","role":"customer","credentials":{"username":"alice","password":"alice123"},"ownedResources":{"user":["1"],"order":["1","2"]}},{"id":"2","username":"bob","role":"customer","credentials":{"username":"bob","password":"bob123"},"ownedResources":{"user":["2"],"order":["3","4"]}}],"checks":{"bola":true,"dataExposure":true,"rateLimiting":true,"rateLimitRequests":5}}'
```

The scan response includes a `scanId`. Poll its status until it reaches `COMPLETED`:

```sh
curl -s http://127.0.0.1:5000/api/scans/<SCAN_ID>/status
```

Example finding summary from the live sandbox (the API returns additional timestamps and evidence fields):

```json
{
  "vulnerabilityType": "BOLA",
  "severity": "critical",
  "confidence": 98,
  "endpoint": "/orders/{id}",
  "attackerIdentity": "1",
  "victimIdentity": "2",
  "affectedObject": "3",
  "ownershipEvidence": "user_id=2; victim identity=2; object=3",
  "impact": {
    "directlyExposed": ["Order"],
    "indirectlyReachable": ["Payment", "Invoice", "Shipment"],
    "attackPathDepth": 2
  }
}
```

Example attack path returned by `GET /api/findings/:id/attack-path`:

```json
{
  "entryPoint": "GET /orders/{id}",
  "attacker": "1",
  "affectedResources": ["order", "payment", "invoice", "shipment"],
  "steps": [
    { "label": "alice", "relationship": "ATTACKER" },
    { "label": "order 3", "relationship": "UNAUTHORIZED_ACCESS" },
    { "label": "payment 502", "relationship": "REFERENCES" }
  ],
  "branches": [
    { "resourceId": "payment", "objectId": "502", "depth": 2 },
    { "resourceId": "invoice", "objectId": "902", "depth": 2 },
    { "resourceId": "shipment", "objectId": "702", "depth": 2 }
  ],
  "depth": 2
}
```

The demo records three independently referenced child-resource branches from the order; it does not claim that payment, invoice, and shipment form a serial chain.

The BOLA PoC is generated from the observed victim-owned ID and leaves the token for the tester to supply:

```sh
curl -i -X GET 'http://127.0.0.1:4000/orders/3' \
  -H 'Authorization: Bearer <USER_A_TOKEN>'
```

The demo configuration explicitly enables destructive checks. BFLA and mass-assignment checks verify the protected state changed, then `/api/demo/reset` restores the known local fixture state. Do not enable destructive checks for a sandbox with state that cannot be reset or safely restored.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health and current remote allowlist mode |
| `POST` | `/api/targets` | Validate/register an HTTP(S) target and OpenAPI source |
| `GET` | `/api/targets` | List registered targets (without identity details) |
| `GET` | `/api/targets/:id` | Read a registered target |
| `GET` | `/api/targets/:id/summary` | Safely parse the configured OpenAPI source and return an endpoint/resource summary |
| `POST` | `/api/scans` | Create a scan; credentials/tokens are request-only inputs |
| `GET` | `/api/scans` | List persisted scans, optionally filtered with `?targetId=...` |
| `GET` | `/api/scans/:id/status` | Read pipeline status and progress |
| `GET` | `/api/scans/:id/findings` | Read findings for a scan |
| `GET` | `/api/scans/:id/graph` | Read graph nodes and edges |
| `GET` | `/api/scans/:id/attack-paths` | Read attack paths |
| `GET` | `/api/scans/:id/report` | Read the structured report |
| `GET` | `/api/findings/:id` | Read a finding without its evidence payload |
| `GET` | `/api/findings/:id/evidence` | Read masked request/response evidence |
| `GET` | `/api/findings/:id/attack-path` | Read the path associated with a finding |
| `POST` | `/api/demo/reset` | Reset only an explicitly registered loopback demo target |
| `POST` | `/api/demo/seed` | Restore the demo fixture to its seed state |

The Next.js dashboard uses the same-origin `/api/sentinel/*` proxy to consume this REST API. Scan module selections include BOLA, BFLA, data exposure, mass assignment, and rate-limit checks. The BFLA and mass-assignment checks are selectable only for targets explicitly marked as destructive-test sandboxes; they remain disabled for custom targets. Every scan persists its parsed endpoint list and endpoint IDs for which requests were actually executed.

To scan another sandbox, set `AUTHORIZED_TARGET_HOSTS` to a comma-separated list of exact hostnames and register the same host with `authorized: true`. Redirects are not followed; the spec URL must use the target's origin. No non-allowlisted public internet scan is accepted. The scan request budget defaults to 60 HTTP requests, request timeout defaults to 5 seconds, and login rate checks are capped at 10 attempts and disabled unless requested.

## Evidence and current scope

- **BOLA:** requires successful victim and attacker requests for a configured victim-owned object, plus an observed response object ID and an owner ID matching the victim. A 200 response by itself is not enough.
- **Attack path/blast radius:** the scanner performs actual nested-resource GET requests as the attacker, confirms responses reference the victim's root object, and intersects those observations with relationships inferred from OpenAPI schemas/routes. Impact is contextual; it is not presented as CVSS.
- **Data exposure:** flags sensitive field names only when observed in real response bodies. Evidence values are recursively redacted; PoCs use token placeholders.
- **BFLA/mass assignment:** require both `sandboxMode: true` and `allowDestructiveTests: true`; a follow-up GET must confirm the mutation.
- **Rate limiting:** makes a small configurable invalid-login burst only for sandbox targets and reports lack of signals as potential, not a confirmed exploit.

The scanner needs at least two explicitly configured identities and the owned IDs each identity may use as test inputs. It currently handles REST/OpenAPI 3.x and common scalar object IDs/owner fields; it does not infer identities or enumerate arbitrary IDs, execute arbitrary request bodies from every schema, roll back state on third-party sandboxes, or provide authentication for the loopback-only backend API. Use it locally or behind a trusted development boundary.

## Verify implementation

```sh
npm run typecheck
npm test
```

The end-to-end test starts the real demo HTTP API, loads its OpenAPI JSON, authenticates the seeded identities, scans responses, verifies BOLA/BFLA/mass-assignment/data-exposure/rate-limit behavior, and checks the downstream payment/invoice/shipment path and reset behavior.
