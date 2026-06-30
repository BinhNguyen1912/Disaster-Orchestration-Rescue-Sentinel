import { DataSource } from 'typeorm';
import { seedUsers } from './user.province-2.seed';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
  });

  await dataSource.initialize();
  console.log('✅ Kết nối database thành công!');

  await seedUsers(dataSource);

  await dataSource.destroy();
  console.log('✅ Hoàn tất!');
}

main();
