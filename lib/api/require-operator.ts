import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Local judge demos are open on localhost; production scanner proxy calls require an authenticated operator. */
export async function requireOperator() {
  if (process.env.NODE_ENV !== 'production') return null;
  // Public demo mode is only safe with the co-hosted loopback sandbox and an empty backend host allowlist.
  if (process.env.PUBLIC_DEMO_MODE === 'true') return null;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Scanner proxy is disabled until production authentication is configured.' }, { status: 503 });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return NextResponse.json({ error: 'Sign in before accessing scanner targets and results.' }, { status: 401 });
    return null;
  } catch {
    return NextResponse.json({ error: 'Unable to verify scanner operator session.' }, { status: 503 });
  }
}
