import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('id');

    if (!targetId) {
      return NextResponse.json({ error: 'Target ID is required' }, { status: 400 });
    }

    const pool = getDbPool();
    // Cascade delete target, its scans and findings
    await pool.query('DELETE FROM findings WHERE target_id = $1', [targetId]);
    await pool.query('DELETE FROM scans WHERE target_id = $1', [targetId]);
    await pool.query('DELETE FROM targets WHERE id = $1', [targetId]);

    return NextResponse.json({ success: true, message: 'Target deleted successfully' });
  } catch (err: unknown) {
    console.error('Delete target error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}
