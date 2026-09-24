#!/usr/bin/env python3
"""
SentinelAPI: Zero-Trust API Vulnerability Scanner (MVP)
Designed strictly with Python 3 standard library (zero external dependencies).

Features:
- Validates host authorization allowlist (localhost / 127.0.0.1 by default)
- Parses OpenAPI 3.0 specification documents (URL or local file)
- Detects Broken Object Level Authorization (BOLA / IDOR) across authenticated contexts
- Detects Excessive Data Exposure (sensitive attributes & Luhn-validated credit cards)
- Detects Missing Rate Limiting on authentication endpoints with bounded bursts
- Generates reproducible, masked proof-of-concept curl commands
- Supports CI/CD gating via --fail-on
"""

import sys
import os
import re
import json
import time
import argparse
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, Set

# Ensure console output handles UTF-8 safely on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ALLOWED_DEFAULT_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}

SENSITIVE_KEY_PATTERNS = [
    "password", "passwd", "card_number", "cvv", "ssn", "token", "secret", "api_key"
]


# =====================================================================
# Utility & Masking Functions
# =====================================================================

def mask_token(token: Optional[str]) -> str:
    """Masks authentication tokens for secure reporting (e.g. 'Bearer eyJ...[redacted]')."""
    if not token:
        return "[none]"
    token_str = str(token).strip()
    if token_str.lower().startswith("bearer "):
        actual = token_str[7:].strip()
        prefix = "Bearer "
    else:
        actual = token_str
        prefix = ""

    if len(actual) <= 8:
        return f"{prefix}***[redacted]"
    return f"{prefix}{actual[:3]}...[redacted]"


def mask_sensitive_value(key: str, val: Any) -> Any:
    """Masks credit cards, passwords, and sensitive strings in output payloads."""
    if isinstance(val, dict):
        return {k: mask_sensitive_value(k, v) for k, v in val.items()}
    if isinstance(val, list):
        return [mask_sensitive_value(key, item) for item in val]
    if isinstance(val, str):
        lowered = key.lower()
        if "card" in lowered:
            digits = re.sub(r"\D", "", val)
            if len(digits) >= 12:
                return f"{digits[:4]}...[redacted]...{digits[-4:]}"
            return "****[redacted]"
        if any(s in lowered for s in ["password", "passwd", "secret", "cvv", "token", "api_key", "ssn"]):
            if len(val) <= 4:
                return "***[redacted]"
            return f"{val[:3]}...[redacted]"
    return val


def luhn_checksum_valid(card_str: str) -> bool:
    """Validates whether a numeric string conforms to the Luhn algorithm (ISO/IEC 7812)."""
    digits = [int(c) for c in card_str if c.isdigit()]
    if len(digits) < 13 or len(digits) > 19:
        return False
    checksum = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = digit * 2
            checksum += (doubled - 9) if doubled > 9 else doubled
        else:
            checksum += digit
    return checksum % 10 == 0


def extract_potential_card_numbers(text: str) -> List[str]:
    """Finds substrings in text that match credit card length and pass Luhn algorithm."""
    # Look for candidate digit sequences between 13 and 19 digits (with optional spaces or dashes)
    candidates = re.findall(r"\b(?:\d[ -]*?){13,19}\b", text)
    valid_cards = []
    for cand in candidates:
        cleaned = re.sub(r"\D", "", cand)
        if 13 <= len(cleaned) <= 19 and luhn_checksum_valid(cleaned):
            valid_cards.append(cleaned)
    return valid_cards


def check_host_authorization(target_url: str, i_am_authorized: bool) -> None:
    """Enforces the critical safety constraint: only test localhost unless explicitly authorized."""
    parsed = urllib.parse.urlparse(target_url)
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError(f"Unable to parse hostname from target URL: {target_url}")

    if hostname not in ALLOWED_DEFAULT_HOSTS and not i_am_authorized:
        print("\n" + "=" * 70, file=sys.stderr)
        print("[-] SAFETY CONSTRAINT ERROR: TARGET HOST REFUSED", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print(f"Target host '{hostname}' is not in the default local allowlist:", file=sys.stderr)
        print(f"  Allowed: {', '.join(sorted(ALLOWED_DEFAULT_HOSTS))}", file=sys.stderr)
        print("\nTo scan remote or non-localhost sandboxes, you must provide explicit confirmation:", file=sys.stderr)
        print("  --i-am-authorized", file=sys.stderr)
        print("=" * 70 + "\n", file=sys.stderr)
        sys.exit(2)


# =====================================================================
# HTTP Request Client (Python stdlib)
# =====================================================================

class HttpClient:
    """Resilient HTTP client using urllib.request with bounded timeouts."""

    def __init__(self, timeout: float = 8.0):
        self.timeout = timeout

    def request(
        self,
        method: str,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Tuple[int, Dict[str, str], Any, str]:
        """
        Executes HTTP request.
        Returns: (status_code, response_headers, parsed_json_or_none, raw_text)
        """
        req_headers = {
            "User-Agent": "SentinelAPI-Vulnerability-Scanner/1.0",
            "Accept": "application/json"
        }
        if headers:
            req_headers.update(headers)

        body_bytes = None
        if data is not None:
            body_bytes = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method=method.upper())

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                status_code = resp.status
                resp_headers = dict(resp.headers)
                raw_bytes = resp.read()
                raw_text = raw_bytes.decode("utf-8", errors="replace")
                try:
                    parsed_json = json.loads(raw_text)
                except Exception:
                    parsed_json = None
                return status_code, resp_headers, parsed_json, raw_text
        except urllib.error.HTTPError as e:
            status_code = e.code
            resp_headers = dict(e.headers)
            try:
                raw_bytes = e.read()
                raw_text = raw_bytes.decode("utf-8", errors="replace")
                parsed_json = json.loads(raw_text)
            except Exception:
                raw_text = ""
                parsed_json = None
            return status_code, resp_headers, parsed_json, raw_text
        except Exception as e:
            return 0, {}, None, f"Network/Connection error: {str(e)}"


# =====================================================================
# OpenAPI Specification Loader
# =====================================================================

def load_openapi_spec(config: Dict[str, Any], client: HttpClient) -> Dict[str, Any]:
    """Loads OpenAPI spec from file path or remote URL specified in config."""
    target_cfg = config.get("target", {})
    spec_file = target_cfg.get("spec_file")
    spec_url = target_cfg.get("spec_url")

    # Try local file first if provided
    if spec_file and os.path.exists(spec_file):
        try:
            with open(spec_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[!] Warning: Failed to load spec_file '{spec_file}': {e}", file=sys.stderr)

    # Try spec URL
    if spec_url:
        status, _, parsed_json, raw_text = client.request("GET", spec_url)
        if status == 200 and parsed_json and isinstance(parsed_json, dict):
            return parsed_json
        else:
            raise RuntimeError(f"Failed to fetch OpenAPI spec from {spec_url} (HTTP {status}): {raw_text[:200]}")

    raise ValueError("Neither 'spec_file' nor 'spec_url' in config could be loaded.")


# =====================================================================
# Authenticator
# =====================================================================

class Authenticator:
    """Authenticates configured test users and holds session tokens."""

    def __init__(self, base_url: str, auth_cfg: Dict[str, Any], client: HttpClient):
        self.base_url = base_url.rstrip("/")
        self.auth_cfg = auth_cfg
        self.client = client
        self.tokens: Dict[str, Optional[str]] = {}

    def authenticate_all(self) -> Dict[str, str]:
        users_cfg = self.auth_cfg.get("users", {})
        login_ep = self.auth_cfg.get("login_endpoint", "/login")
        method = self.auth_cfg.get("method", "POST")
        token_path = self.auth_cfg.get("token_json_path", "token")
        prefix = self.auth_cfg.get("token_header_prefix", "Bearer ")

        login_url = urllib.parse.urljoin(self.base_url, login_ep)

        for user_key in ["user_a", "user_b"]:
            user_data = users_cfg.get(user_key)
            if not user_data:
                continue

            creds = user_data.get("credentials", {})
            status, _, parsed_json, raw_text = self.client.request(method, login_url, data=creds)

            if status != 200 or not parsed_json:
                print(f"[!] Warning: Failed to authenticate {user_key} at {login_ep} (HTTP {status}).", file=sys.stderr)
                self.tokens[user_key] = None
                continue

            # Extract token using simple dot-path if necessary
            val = parsed_json
            for part in token_path.split("."):
                if isinstance(val, dict):
                    val = val.get(part)
                else:
                    val = None
                    break

            if val:
                header_val = f"{prefix}{val}" if not str(val).startswith(prefix) else str(val)
                self.tokens[user_key] = header_val
            else:
                print(f"[!] Warning: Token path '{token_path}' not found in login response for {user_key}.", file=sys.stderr)
                self.tokens[user_key] = None

        return self.tokens


# =====================================================================
# Security Vulnerability Checkers
# =====================================================================

class ScannerEngine:
    """Core vulnerability analysis engine orchestrating tests against the API."""

    def __init__(
        self,
        config: Dict[str, Any],
        spec: Dict[str, Any],
        tokens: Dict[str, str],
        client: HttpClient
    ):
        self.config = config
        self.spec = spec
        self.tokens = tokens
        self.client = client
        self.base_url = config.get("target", {}).get("base_url", "http://localhost:4000").rstrip("/")
        self.findings: List[Dict[str, Any]] = []
        self._finding_counter = 1

    def _next_finding_id(self, code: str) -> str:
        fid = f"SENTINEL-{code}-{self._finding_counter:02d}"
        self._finding_counter += 1
        return fid

    def run_all(self) -> List[Dict[str, Any]]:
        """Executes enabled vulnerability checks."""
        checks_cfg = self.config.get("checks", {})

        # 1. BOLA / IDOR Testing
        if checks_cfg.get("bola", {}).get("enabled", True):
            self.check_bola()

        # 2. Excessive Data Exposure
        if checks_cfg.get("excessive_data_exposure", {}).get("enabled", True):
            self.check_excessive_data_exposure()

        # 3. Missing Rate Limiting
        if checks_cfg.get("rate_limiting", {}).get("enabled", True):
            self.check_rate_limiting()

        return self.findings

    # -----------------------------------------------------------------
    # Check 1: BOLA / IDOR Analysis
    # -----------------------------------------------------------------
    def check_bola(self) -> None:
        """
        Scans parameterized endpoints for Broken Object Level Authorization (OWASP API1:2023).
        Validates cross-user authorization: User A accessing User B's resource.
        """
        token_a = self.tokens.get("user_a")
        token_b = self.tokens.get("user_b")
        if not token_a or not token_b:
            print("[-] BOLA check skipped: Both user_a and user_b tokens are required.", file=sys.stderr)
            return

        users_cfg = self.config.get("auth", {}).get("users", {})
        user_a_seeds = users_cfg.get("user_a", {}).get("seed_ids", {})
        user_b_seeds = users_cfg.get("user_b", {}).get("seed_ids", {})

        paths = self.spec.get("paths", {})

        for path_template, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue

            get_op = path_item.get("get")
            if not get_op:
                continue

            # Identify if endpoint has path parameter like {id} or {userId}
            param_matches = re.findall(r"\{([a-zA-Z0-9_]+)\}", path_template)
            if not param_matches:
                continue

            # Identify resource category from path (e.g. /orders/{id} -> "orders")
            path_segments = [s for s in path_template.strip("/").split("/") if not s.startswith("{")]
            resource_key = path_segments[-1] if path_segments else "default"

            # Determine User B test IDs
            b_ids = user_b_seeds.get(resource_key) or user_b_seeds.get("id") or user_b_seeds.get("default", [2])
            if not isinstance(b_ids, list):
                b_ids = [b_ids]

            # Test each ID, but EMIT AT MOST ONE finding per path template
            endpoint_flagged = False

            for test_id in b_ids:
                if endpoint_flagged:
                    break

                # Construct concrete endpoint path
                concrete_path = path_template
                for p in param_matches:
                    concrete_path = concrete_path.replace(f"{{{p}}}", str(test_id))

                target_url = urllib.parse.urljoin(self.base_url, concrete_path)

                # 1. Request as User B (legitimate owner baseline)
                status_b, _, body_b, _ = self.client.request(
                    "GET", target_url, headers={"Authorization": token_b}
                )

                if status_b != 200 or not body_b:
                    # Resource not accessible to B; cannot establish baseline
                    continue

                # 2. Request as User A (unauthorized cross-tenant attempt)
                status_a, _, body_a, _ = self.client.request(
                    "GET", target_url, headers={"Authorization": token_a}
                )

                # Precision rule: Flag ONLY if status is 200 AND body matches what B received for the same ID
                if status_a == 200 and body_a:
                    is_match = False
                    if isinstance(body_a, dict) and isinstance(body_b, dict):
                        # Compare critical identifiers or structural equality
                        if body_a == body_b or (
                            body_a.get("id") == body_b.get("id") and body_a.get("id") == test_id
                        ):
                            is_match = True
                    elif body_a == body_b:
                        is_match = True

                    if is_match:
                        endpoint_flagged = True
                        finding_id = self._next_finding_id("BOLA")
                        title = f"Broken Object Level Authorization (BOLA) in {path_template}"
                        explanation = (
                            f"The endpoint '{path_template}' failed to verify resource ownership. "
                            f"User A ('alice') successfully accessed User B's ('bob') private record "
                            f"(ID: {test_id}) without authorization. In a zero-trust model, users must "
                            f"only be allowed to query records tied directly to their authenticated session."
                        )
                        masked_evidence = {
                            "tested_endpoint": concrete_path,
                            "resource_id": test_id,
                            "user_a_status": status_a,
                            "user_b_status": status_b,
                            "data_sample": mask_sensitive_value("evidence", body_a)
                        }
                        curl_repro = (
                            f"curl -X GET \"{target_url}\" \\\n"
                            f"  -H \"Authorization: {mask_token(token_a)}\" \\\n"
                            f"  -H \"Accept: application/json\""
                        )
                        recommendation = (
                            f"Enforce strict ownership validation at the data-access layer for '{path_template}'. "
                            f"Verify that the requesting subject's ID (extracted securely from the authenticated token) "
                            f"matches the resource's owner_id before executing the database query or returning results."
                        )

                        self.findings.append({
                            "id": finding_id,
                            "title": title,
                            "vulnerability_class": "Broken Object Level Authorization (BOLA / IDOR)",
                            "severity": "High",
                            "endpoint": f"GET {path_template}",
                            "explanation": explanation,
                            "evidence": masked_evidence,
                            "reproduction": curl_repro,
                            "recommendation": recommendation
                        })

    # -----------------------------------------------------------------
    # Check 2: Excessive Data Exposure & Luhn Card Detection
    # -----------------------------------------------------------------
    def check_excessive_data_exposure(self) -> None:
        """
        Scans JSON responses recursively for sensitive field names and credit card numbers.
        Emits one finding per endpoint template.
        """
        token_a = self.tokens.get("user_a")
        if not token_a:
            return

        users_cfg = self.config.get("auth", {}).get("users", {})
        user_a_seeds = users_cfg.get("user_a", {}).get("seed_ids", {})
        sensitive_field_names = self.config.get("checks", {}).get("excessive_data_exposure", {}).get(
            "sensitive_fields", SENSITIVE_KEY_PATTERNS
        )

        paths = self.spec.get("paths", {})

        for path_template, path_item in paths.items():
            if not isinstance(path_item, dict):
                continue
            get_op = path_item.get("get")
            if not get_op:
                continue

            # Skip API schema/documentation definitions from data exposure tests
            if any(sub in path_template.lower() for sub in ["openapi", "swagger", "api-docs"]):
                continue

            param_matches = re.findall(r"\{([a-zA-Z0-9_]+)\}", path_template)
            path_segments = [s for s in path_template.strip("/").split("/") if not s.startswith("{")]
            resource_key = path_segments[-1] if path_segments else "default"

            test_ids = user_a_seeds.get(resource_key) or user_a_seeds.get("id") or [1]
            if not isinstance(test_ids, list):
                test_ids = [test_ids]

            target_id = test_ids[0] if test_ids else 1
            concrete_path = path_template
            for p in param_matches:
                concrete_path = concrete_path.replace(f"{{{p}}}", str(target_id))

            target_url = urllib.parse.urljoin(self.base_url, concrete_path)
            status, _, body, raw_text = self.client.request(
                "GET", target_url, headers={"Authorization": token_a}
            )

            if status != 200 or not body:
                continue

            # Recursively analyze payload
            found_sensitive_keys = self._find_sensitive_keys(body, sensitive_field_names)
            luhn_cards = extract_potential_card_numbers(raw_text)

            # Determine if this response exposes credentials or financial data
            has_password = any(k in ["password", "passwd"] for k in found_sensitive_keys)
            has_cards = len(luhn_cards) > 0 or (
                any(k in ["card_number", "cvv"] for k in found_sensitive_keys) and len(luhn_cards) > 0
            )

            if has_password:
                fid = self._next_finding_id("DATA-EXP")
                title = f"Excessive Data Exposure: Plaintext Password Leak in {path_template}"
                explanation = (
                    f"The endpoint '{path_template}' exposes user credentials in plaintext within the response payload. "
                    f"Client applications rarely require raw passwords or hashes. Exposing credentials allows any "
                    f"compromised client, MITM observer, or caching layer to harvest sensitive access keys."
                )
                masked_evidence = {
                    "exposed_fields": [k for k in found_sensitive_keys if k in ["password", "passwd"]],
                    "sample_payload": mask_sensitive_value("payload", body)
                }
                curl_repro = (
                    f"curl -X GET \"{target_url}\" \\\n"
                    f"  -H \"Authorization: {mask_token(token_a)}\" \\\n"
                    f"  -H \"Accept: application/json\""
                )
                recommendation = (
                    f"Remove password fields from API Data Transfer Objects (DTOs) and serialization schemas for '{path_template}'. "
                    f"Ensure authentication hashes and plaintext secrets are stripped before returning user data."
                )
                self.findings.append({
                    "id": fid,
                    "title": title,
                    "vulnerability_class": "Excessive Data Exposure / Credential Leakage",
                    "severity": "High",
                    "endpoint": f"GET {path_template}",
                    "explanation": explanation,
                    "evidence": masked_evidence,
                    "reproduction": curl_repro,
                    "recommendation": recommendation
                })

            if has_cards:
                fid = self._next_finding_id("DATA-EXP")
                title = f"Excessive Data Exposure: Unmasked Payment Card Data in {path_template}"
                explanation = (
                    f"The endpoint '{path_template}' returns unmasked primary account numbers (PAN) that successfully "
                    f"pass the Luhn checksum algorithm. Exposing full payment card numbers violates PCI-DSS Requirement 3.3 "
                    f"and significantly increases financial fraud risk."
                )
                masked_evidence = {
                    "detected_card_count": len(luhn_cards) if luhn_cards else 1,
                    "sample_masked_card": f"{luhn_cards[0][:4]}...[redacted]...{luhn_cards[0][-4:]}" if luhn_cards else "****[redacted]",
                    "sample_payload": mask_sensitive_value("payload", body)
                }
                curl_repro = (
                    f"curl -X GET \"{target_url}\" \\\n"
                    f"  -H \"Authorization: {mask_token(token_a)}\" \\\n"
                    f"  -H \"Accept: application/json\""
                )
                recommendation = (
                    f"Mask all payment card numbers returned by '{path_template}', displaying at most the first 6 and "
                    f"last 4 digits (e.g., '4532-****-****-1235'). Store and transmit tokens rather than raw PANs."
                )
                self.findings.append({
                    "id": fid,
                    "title": title,
                    "vulnerability_class": "Excessive Data Exposure / Financial Data (PCI-DSS)",
                    "severity": "High",
                    "endpoint": f"GET {path_template}",
                    "explanation": explanation,
                    "evidence": masked_evidence,
                    "reproduction": curl_repro,
                    "recommendation": recommendation
                })

            # Check other sensitive fields if neither password nor card was the primary
            other_keys = [k for k in found_sensitive_keys if k not in ["password", "passwd", "card_number", "cvv"]]
            if other_keys and not has_password and not has_cards:
                fid = self._next_finding_id("DATA-EXP")
                title = f"Excessive Data Exposure: Sensitive Attributes in {path_template}"
                explanation = (
                    f"The endpoint '{path_template}' exposes potentially sensitive attributes ({', '.join(other_keys)}) "
                    f"in the response object."
                )
                masked_evidence = {
                    "exposed_fields": other_keys,
                    "sample_payload": mask_sensitive_value("payload", body)
                }
                curl_repro = (
                    f"curl -X GET \"{target_url}\" \\\n"
                    f"  -H \"Authorization: {mask_token(token_a)}\" \\\n"
                    f"  -H \"Accept: application/json\""
                )
                recommendation = (
                    f"Audit the serialization schema of '{path_template}' to verify whether fields like "
                    f"{', '.join(other_keys)} are strictly required by clients."
                )
                self.findings.append({
                    "id": fid,
                    "title": title,
                    "vulnerability_class": "Excessive Data Exposure",
                    "severity": "Medium",
                    "endpoint": f"GET {path_template}",
                    "explanation": explanation,
                    "evidence": masked_evidence,
                    "reproduction": curl_repro,
                    "recommendation": recommendation
                })

    def _find_sensitive_keys(self, obj: Any, target_patterns: List[str]) -> Set[str]:
        """Recursively inspects JSON objects for sensitive field keys."""
        matches = set()
        if isinstance(obj, dict):
            for k, v in obj.items():
                k_lower = str(k).lower()
                for pattern in target_patterns:
                    if pattern in k_lower:
                        matches.add(k_lower)
                matches.update(self._find_sensitive_keys(v, target_patterns))
        elif isinstance(obj, list):
            for item in obj:
                matches.update(self._find_sensitive_keys(item, target_patterns))
        return matches

    # -----------------------------------------------------------------
    # Check 3: Rate Limiting on Login Endpoint
    # -----------------------------------------------------------------
    def check_rate_limiting(self) -> None:
        """
        Sends a bounded burst of requests to the login endpoint to check for throttling
        and rate-limit signaling headers (e.g. 429, Retry-After, X-RateLimit-*).
        """
        rl_cfg = self.config.get("checks", {}).get("rate_limiting", {})
        login_ep = rl_cfg.get("endpoint", "/login")
        method = rl_cfg.get("method", "POST")
        burst_count = min(int(rl_cfg.get("burst_count", 30)), 50)  # Safe bound
        test_payload = rl_cfg.get("payload", {"username": "sentinel_test", "password": "bad_password_burst"})

        target_url = urllib.parse.urljoin(self.base_url, login_ep)

        status_codes = []
        has_rate_limit_headers = False
        received_429 = False

        for _ in range(burst_count):
            status, headers, _, _ = self.client.request(method, target_url, data=test_payload)
            status_codes.append(status)
            if status == 429:
                received_429 = True
                break

            for header_name in headers.keys():
                hl = header_name.lower()
                if hl.startswith("x-ratelimit-") or hl.startswith("ratelimit-") or hl == "retry-after":
                    has_rate_limit_headers = True
                    break

            if has_rate_limit_headers:
                break

        # If no 429 and no rate limit headers were encountered across the entire burst
        if not received_429 and not has_rate_limit_headers:
            fid = self._next_finding_id("RATE-LIMIT")
            title = f"Missing Rate Limiting on Authentication Endpoint ({login_ep})"
            explanation = (
                f"The authentication endpoint '{login_ep}' accepted a bounded burst of {burst_count} rapid "
                f"requests without triggering HTTP 429 (Too Many Requests) or signaling rate limit status headers "
                f"('Retry-After', 'X-RateLimit-*'). Unbounded authentication endpoints enable credential stuffing "
                f"and brute-force dictionary attacks against user accounts."
            )
            masked_evidence = {
                "tested_endpoint": login_ep,
                "burst_requests_sent": len(status_codes),
                "status_distribution": {f"HTTP_{c}": status_codes.count(c) for c in set(status_codes)},
                "rate_limiting_headers_detected": False,
                "http_429_observed": False
            }
            curl_repro = (
                f"for i in $(seq 1 {burst_count}); do\n"
                f"  curl -s -o /dev/null -w \"HTTP %{{http_code}}\\n\" -X {method} \"{target_url}\" \\\n"
                f"    -H \"Content-Type: application/json\" \\\n"
                f"    -d '{json.dumps(test_payload)}'\n"
                f"done"
            )
            recommendation = (
                f"Implement rate limiting on '{login_ep}' using an IP and account-based token bucket or leaky bucket algorithm. "
                f"Enforce standard HTTP 429 status responses accompanied by 'Retry-After' and 'X-RateLimit-Reset' headers "
                f"when request thresholds are exceeded."
            )
            self.findings.append({
                "id": fid,
                "title": title,
                "vulnerability_class": "Missing Rate Limiting / Authentication Brute-Force",
                "severity": "Medium",
                "endpoint": f"{method} {login_ep}",
                "explanation": explanation,
                "evidence": masked_evidence,
                "reproduction": curl_repro,
                "recommendation": recommendation
            })


# =====================================================================
# Main CLI Entrypoint
# =====================================================================

def parse_args():
    parser = argparse.ArgumentParser(
        description="SentinelAPI - Zero-Trust API Vulnerability Scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scanner.py --config config.example.json --out findings.json
  python scanner.py --config config.json --fail-on high
  python scanner.py --config remote-config.json --i-am-authorized
        """
    )
    parser.add_argument(
        "--config",
        default="config.example.json",
        help="Path to the JSON scanner configuration file (default: config.example.json)"
    )
    parser.add_argument(
        "--out",
        default="findings.json",
        help="Path to write the resulting JSON report (default: findings.json)"
    )
    parser.add_argument(
        "--i-am-authorized",
        action="store_true",
        help="Explicitly confirm authorization when scanning non-localhost targets"
    )
    parser.add_argument(
        "--fail-on",
        choices=["high", "medium", "low"],
        help="Exit with non-zero status code if any finding of this severity or higher is discovered (for CI/CD gating)"
    )
    return parser.parse_args()


def main():
    args = parse_args()
    start_time = time.time()

    print("=" * 65)
    print("  [SENTINEL-API] Zero-Trust API Vulnerability Scanner")
    print("=" * 65)

    # 1. Load Configuration
    if not os.path.exists(args.config):
        print(f"[-] Error: Configuration file '{args.config}' not found.", file=sys.stderr)
        sys.exit(1)

    try:
        with open(args.config, "r", encoding="utf-8") as f:
            config = json.load(f)
    except Exception as e:
        print(f"[-] Error parsing configuration file '{args.config}': {e}", file=sys.stderr)
        sys.exit(1)

    target_base = config.get("target", {}).get("base_url", "http://localhost:4000")

    # 2. Safety Constraint Check
    check_host_authorization(target_base, args.i_am_authorized)
    print(f"[*] Target Base URL: {target_base}")

    client = HttpClient()

    # 3. Load OpenAPI Specification
    print("[*] Fetching and parsing OpenAPI 3.0 specification...")
    try:
        spec = load_openapi_spec(config, client)
        spec_title = spec.get("info", {}).get("title", "Unnamed API")
        spec_version = spec.get("info", {}).get("version", "1.0")
        print(f"    [+] Loaded spec: '{spec_title}' (v{spec_version}) with {len(spec.get('paths', {}))} paths")
    except Exception as e:
        print(f"[-] Error loading OpenAPI specification: {e}", file=sys.stderr)
        sys.exit(1)

    # 4. Authenticate Test Users
    print("[*] Authenticating test user identities...")
    auth = Authenticator(target_base, config.get("auth", {}), client)
    tokens = auth.authenticate_all()

    for user_key, token in tokens.items():
        if token:
            print(f"    [+] {user_key}: Authenticated ({mask_token(token)})")
        else:
            print(f"    [-] {user_key}: Failed to authenticate")

    # 5. Execute Security Checks
    print("\n[*] Commencing vulnerability assessments...")
    scanner = ScannerEngine(config, spec, tokens, client)
    findings = scanner.run_all()

    duration = round(time.time() - start_time, 2)
    severity_counts = {
        "High": sum(1 for f in findings if f.get("severity") == "High"),
        "Medium": sum(1 for f in findings if f.get("severity") == "Medium"),
        "Low": sum(1 for f in findings if f.get("severity") == "Low")
    }

    # 6. Generate Output Report
    report = {
        "scan_metadata": {
            "scanner": "SentinelAPI v1.0.0",
            "target_base_url": target_base,
            "target_spec_title": spec.get("info", {}).get("title", "Unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": duration,
            "total_findings": len(findings),
            "severity_counts": severity_counts
        },
        "findings": findings
    }

    try:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\n[+] Scan complete in {duration}s. Report written to: {args.out}")
    except Exception as e:
        print(f"[-] Error writing report to '{args.out}': {e}", file=sys.stderr)

    # 7. Summary Display
    print("\n" + "-" * 40)
    print(f"  Summary: {len(findings)} findings discovered")
    print(f"  High:   {severity_counts['High']}")
    print(f"  Medium: {severity_counts['Medium']}")
    print(f"  Low:    {severity_counts['Low']}")
    print("-" * 40)

    for idx, f in enumerate(findings, 1):
        color_tag = "[HIGH]" if f['severity'] == "High" else f"[{f['severity'].upper()}]"
        print(f"{idx}. {color_tag} {f['title']} ({f['endpoint']})")

    # 8. CI/CD Threshold Evaluation
    if args.fail_on:
        threshold = args.fail_on.lower()
        fail = False
        if threshold == "high" and severity_counts["High"] > 0:
            fail = True
        elif threshold == "medium" and (severity_counts["High"] > 0 or severity_counts["Medium"] > 0):
            fail = True
        elif threshold == "low" and len(findings) > 0:
            fail = True

        if fail:
            print(f"\n[!] CI/CD Gating Alert: Findings equal or exceed threshold '--fail-on {threshold}'. Exiting with code 1.")
            sys.exit(1)

    print("\n[+] Scan finished successfully.")
    sys.exit(0)


if __name__ == "__main__":
    main()
