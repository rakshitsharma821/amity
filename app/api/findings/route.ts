import { NextResponse, type NextRequest } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');

    const pool = getDbPool();
    let query = 'SELECT * FROM findings';
    const params: string[] = [];

    if (targetId) {
      query += ' WHERE target_id = $1';
      params.push(targetId);
    }

    query += ' ORDER BY created_at DESC';

    const res = await pool.query(query, params);

    return NextResponse.json({
      findings: res.rows,
    });
  } catch (err: unknown) {
    console.error('Error fetching findings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Database error' },
      { status: 500 }
    );
  }
}
