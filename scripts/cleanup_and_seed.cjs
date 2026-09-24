const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hajugkklfwxqmlrdekjg:Rakshit94603%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();

  // 1. Delete all old duplicate targets and findings
  await client.query('DELETE FROM findings;');
  await client.query('DELETE FROM scans;');
  await client.query('DELETE FROM targets;');

  const userId = '5b17954b-c60d-44aa-bf96-b40a05747dc0';

  // 2. Insert Target 1: VEIL API (Render)
  const t1 = await client.query(
    `INSERT INTO targets (user_id, name, base_url, spec_url, verification_token, verification_method, is_verified, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [
      userId,
      'VEIL Security API',
      'https://veil-api-vuiz.onrender.com',
      'https://veil-api-vuiz.onrender.com/openapi.json',
      'sentinel_verify_veil_target',
      'well_known',
      true
    ]
  );
  const target1Id = t1.rows[0].id;

  // 3. Insert Target 2: ChainSentinel API (Render)
  const t2 = await client.query(
    `INSERT INTO targets (user_id, name, base_url, spec_url, verification_token, verification_method, is_verified, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [
      userId,
      'ChainSentinel Forensics API',
      'https://sih-dm42.onrender.com',
      'https://sih-dm42.onrender.com/openapi.json',
      'sentinel_verify_chainsentinel_target',
      'well_known',
      true
    ]
  );
  const target2Id = t2.rows[0].id;

  console.log('Cleaned and seeded targets:', { target1Id, target2Id });
  await client.end();
}

main().catch(console.error);
