import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/api/require-operator';

// Keep the loopback backend off the browser and avoid requiring cross-origin API access.
const backendBase = (process.env.SCANNER_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const denied = await requireOperator();
  if (denied) return denied;
  const { path } = await context.params;
  const route = path.join('/');
  if (!['health', 'targets', 'scans', 'findings', 'demo'].some((prefix) => route === prefix || route.startsWith(`${prefix}/`))) {
    return NextResponse.json({ error: 'Backend route is not available through this proxy' }, { status: 404 });
  }

  const upstream = `${backendBase}/api/${route}${request.nextUrl.search}`;
  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers: request.method === 'GET' ? undefined : { 'Content-Type': request.headers.get('content-type') || 'application/json' },
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return NextResponse.json({ error: timedOut ? 'SentinelAPI backend request timed out' : 'SentinelAPI backend is unavailable. Start the local backend and try again.' }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
