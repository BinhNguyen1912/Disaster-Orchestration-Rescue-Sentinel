const { Client } = require('pg');

const client = new Client({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '123123',
  database: 'rescue_system',
});

client.connect()
  .then(() => {
    console.log('Connected successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
