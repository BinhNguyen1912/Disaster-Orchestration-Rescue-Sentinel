import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'rescue_system',
  entities: [],
  synchronize: false,
});

async function run() {
  await AppDataSource.initialize();
  console.log('Database connected!');
  
  const users = await AppDataSource.query('SELECT id, email, "provinceId" FROM "user"');
  console.log('Users in database:', users);
  
  await AppDataSource.destroy();
}

run().catch(console.error);
