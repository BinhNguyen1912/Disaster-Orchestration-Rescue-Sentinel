const { createClient } = require('redis');

async function test() {
  const client = createClient({ url: 'redis://localhost:6379' });
  client.on('error', (err) => console.log('Redis Client Error', err));
  await client.connect();
  console.log('Connected!');
  const keys = await client.keys('rate-limit:flood-request:*');
  console.log('Keys:', keys);
  for (const k of keys) {
    const val = await client.get(k);
    console.log(k, '=>', val);
  }
  await client.disconnect();
}

test().catch(console.error);
