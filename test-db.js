const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: '123123',
  database: 'rescue_system'
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
