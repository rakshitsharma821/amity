import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNextPath(value: string | null, origin: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  try {
    const destination = new URL(value, origin);
    return destination.origin === origin ? `${destination.pathname}${destination.search}${destination.hash}` : '/dashboard';
  } catch {
    return '/dashboard';
  }
}

function loginWithError(request: NextRequest) {
  const destination = new URL('/login', request.url);
  destination.searchParams.set('error', 'oauth_callback_failed');
  return NextResponse.redirect(destination);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeNextPath(requestUrl.searchParams.get('next'), requestUrl.origin);

  if (requestUrl.searchParams.has('error') || !code) return loginWithError(request);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginWithError(request);
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  } catch {
    return loginWithError(request);
  }
}
