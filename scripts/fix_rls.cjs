const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.hajugkklfwxqmlrdekjg:Rakshit94603%40@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  await client.query(`DROP POLICY IF EXISTS "Users can insert own findings" ON public.findings;`);
  await client.query(`CREATE POLICY "Users can insert own findings" ON public.findings FOR INSERT WITH CHECK (auth.uid() = user_id);`);
  await client.query(`DROP POLICY IF EXISTS "Users can delete own findings" ON public.findings;`);
  await client.query(`CREATE POLICY "Users can delete own findings" ON public.findings FOR DELETE USING (auth.uid() = user_id);`);
  console.log('Successfully updated RLS policies on public.findings!');
  await client.end();
}

main().catch(console.error);
