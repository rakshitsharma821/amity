import { NextResponse, type NextRequest } from 'next/server';
import { runSecurityAudit } from '@/lib/scanner-engine';
import { getDbPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { targetId, baseUrl, specUrl, isVerified, userId: bodyUserId } = await request.json();

    // 1. Mandatory Ownership Verification Check
    if (!isVerified) {
      return NextResponse.json(
        {
          error:
            'Security Gate Blocked: Target domain ownership must be verified before any security scan can be dispatched.',
        },
        { status: 403 }
      );
    }

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Target baseUrl is required for scanning.' },
        { status: 400 }
      );
    }

    // 2. Execute Real Live Security Audit
    const auditResult = await runSecurityAudit({
      id: targetId,
      baseUrl,
      specUrl,
    });

    let scanRecordId: string | null = null;
    let userId = bodyUserId;

    // 3. Persist scan and findings to PostgreSQL database
    try {
      const pool = getDbPool();

      if (!userId && targetId) {
        const targetRes = await pool.query('SELECT user_id FROM targets WHERE id = $1', [targetId]);
        if (targetRes.rows.length > 0) {
          userId = targetRes.rows[0].user_id;
        }
      }

      if (userId && targetId) {
        const scanRes = await pool.query(
          `INSERT INTO scans (target_id, user_id, status, total_findings, high_count, medium_count, low_count, duration_seconds, completed_at)
           VALUES ($1, $2, 'completed', $3, $4, $5, $6, $7, NOW())
           RETURNING id`,
          [
            targetId,
            userId,
            auditResult.totalFindings,
            auditResult.highCount,
            auditResult.mediumCount,
            auditResult.lowCount,
            auditResult.durationSeconds,
          ]
        );

        if (scanRes.rows.length > 0) {
          scanRecordId = scanRes.rows[0].id;

          for (const f of auditResult.findings) {
            await pool.query(
              `INSERT INTO findings (scan_id, target_id, user_id, finding_code, title, vulnerability_class, severity, endpoint, explanation, evidence, reproduction, recommendation)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                scanRecordId,
                targetId,
                userId,
                f.finding_code,
                f.title,
                f.vulnerability_class,
                f.severity,
                f.endpoint,
                f.explanation,
                JSON.stringify(f.evidence),
                f.reproduction,
                f.recommendation,
              ]
            );
          }
        }
      }
    } catch (dbErr) {
      console.error('Database persistence error during scan:', dbErr);
    }

    return NextResponse.json({
      status: 'completed',
      targetId: auditResult.targetId,
      scanId: scanRecordId,
      durationSeconds: auditResult.durationSeconds,
      totalFindings: auditResult.totalFindings,
      highCount: auditResult.highCount,
      mediumCount: auditResult.mediumCount,
      lowCount: auditResult.lowCount,
      findings: auditResult.findings,
      message: `Audit completed in ${auditResult.durationSeconds}s. Found ${auditResult.totalFindings} vulnerabilities.`,
    });
  } catch (err: unknown) {
    console.error('Scan execution error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan request failed' },
      { status: 500 }
    );
  }
}
