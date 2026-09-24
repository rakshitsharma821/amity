import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { targetId, targetName, baseUrl, specUrl, isVerified } = await request.json();

    // 1. Mandatory Ownership Verification Check
    if (!isVerified) {
      return NextResponse.json(
        {
          error:
            'Security Gate Blocked: Target domain ownership must be verified before any scan can be dispatched.',
        },
        { status: 403 }
      );
    }

    const scannerApiUrl = process.env.SCANNER_API_URL;

    // 2. Honest Scanner Daemon Connectivity Check
    if (!scannerApiUrl) {
      return NextResponse.json(
        {
          status: 'disconnected',
          error:
            'Scanner service not connected. Please set the SCANNER_API_URL environment variable to your running SentinelAPI scanning daemon or execute the CLI scanner engine locally.',
        },
        { status: 503 }
      );
    }

    // 3. Dispatch to remote scanner service
    try {
      const res = await fetch(`${scannerApiUrl.replace(/\/$/, '')}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_id: targetId,
          base_url: baseUrl,
          spec_url: specUrl,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: `Scanner daemon error (${res.status}): ${text}` },
          { status: 502 }
        );
      }

      const scanResult = await res.json();
      return NextResponse.json({
        status: 'running',
        jobId: scanResult.job_id || scanResult.id,
        message: 'Scan dispatched to scanner engine.',
      });
    } catch (err: unknown) {
      return NextResponse.json(
        {
          status: 'error',
          error: `Unable to connect to scanner service at ${scannerApiUrl}: ${
            err instanceof Error ? err.message : 'Connection refused'
          }`,
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan request failed' },
      { status: 500 }
    );
  }
}
