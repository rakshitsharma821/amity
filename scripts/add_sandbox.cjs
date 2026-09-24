const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hajugkklfwxqmlrdekjg:Rakshit94603%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const res = await client.query(
    `INSERT INTO targets (user_id, name, base_url, spec_url, verification_token, verification_method, is_verified, verified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id`,
    [
      '5b17954b-c60d-44aa-bf96-b40a05747dc0',
      'Local Vulnerable Sandbox API',
      'http://localhost:4000',
      'http://localhost:4000/openapi.json',
      'sentinel_verify_local_sandbox',
      'well_known',
      true,
    ]
  );
  console.log('Inserted target:', res.rows[0].id);
  await client.end();
}

main().catch(console.error);
