import { NextResponse, type NextRequest } from 'next/server';
import { contactFormSchema } from '@/lib/validation';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const result = contactFormSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid form input' },
        { status: 400 }
      );
    }

    const { name, email, company, message, source, honeypot } = result.data;

    // Honeypot spam trap
    if (honeypot) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const admin = createAdminClient();
    const supabase = admin || (await (async () => {
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
    })());

    // Persist to Supabase database
    if (supabase) {
      const { error } = await supabase.from('contact_submissions').insert({
        name,
        email,
        company: company || null,
        message,
        source,
      });

      if (error) {
        console.error('Supabase contact submission error:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inquiry received. A security engineer will review your request.',
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
