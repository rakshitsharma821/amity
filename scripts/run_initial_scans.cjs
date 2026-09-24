const fetch = globalThis.fetch;

async function main() {
  console.log('Dispatching scan for Target 1 (VEIL API)...');
  const res1 = await fetch('http://localhost:3000/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetId: '5878d81a-437c-4012-833f-17fb1e43cdf6',
      baseUrl: 'https://veil-api-vuiz.onrender.com',
      specUrl: 'https://veil-api-vuiz.onrender.com/openapi.json',
      isVerified: true
    })
  });
  const data1 = await res1.json();
  console.log('VEIL API scan result:', data1.status, 'Total findings:', data1.totalFindings);

  console.log('Dispatching scan for Target 2 (ChainSentinel)...');
  const res2 = await fetch('http://localhost:3000/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetId: '39ff0714-83b7-4664-b68b-8e47a2cfdac9',
      baseUrl: 'https://sih-dm42.onrender.com',
      specUrl: 'https://sih-dm42.onrender.com/openapi.json',
      isVerified: true
    })
  });
  const data2 = await res2.json();
  console.log('ChainSentinel scan result:', data2.status, 'Total findings:', data2.totalFindings);
}

main().catch(console.error);
