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

    // If Supabase service role is configured, persist to database
    if (admin) {
      const { error } = await admin.from('contact_submissions').insert({
        name,
        email,
        company: company || null,
        message,
        source,
      });

      if (error) {
        console.error('Supabase contact submission error:', error.message);
        // Do not crash client if table does not exist yet; acknowledge receipt
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
