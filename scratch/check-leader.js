const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:123123@localhost:5433/rescue_system",
  });
  await client.connect();
  
  await client.query(`
    UPDATE rescue_team
    SET status = 'AVAILABLE', "activeCasesCount" = 0
    WHERE id IN (3, 4, 8)
  `);
  
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('123123', 10);
  
  await client.query(`
    UPDATE rescue_team
    SET status = 'AVAILABLE', "activeCasesCount" = 0
    WHERE id IN (3, 4, 8)
  `);
  
  console.log("Teams status reset to AVAILABLE successfully!");
  await client.end();
}

main().catch(console.error);
