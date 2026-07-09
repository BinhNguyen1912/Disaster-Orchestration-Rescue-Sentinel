import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

// Read database environment configuration manually
function loadEnv(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^"|"$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

async function clearSosRequests(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123123',
    database: process.env.DB_NAME || 'rescue_system',
  });

  try {
    await dataSource.initialize();
    console.log('[ClearSosRequests] 🔄 Connection to database established.');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      console.log('[ClearSosRequests] 🔗 Unlinking sosRequestId from casualty records...');
      await queryRunner.query('UPDATE "casualty" SET "sosRequestId" = NULL;');

      console.log('[ClearSosRequests] 🗑️ Deleting all sos_request records (will cascade to sos_status_history)...');
      const deleteResult = await queryRunner.query('DELETE FROM "sos_request";');
      console.log('[ClearSosRequests] Deleted all records from sos_request.');

      console.log('[ClearSosRequests] 🔄 Resetting database auto-increment sequences...');
      try {
        await queryRunner.query('ALTER SEQUENCE sos_request_id_seq RESTART WITH 1;');
        console.log('  - Reset sequence sos_request_id_seq to 1');
      } catch (err: any) {
        console.warn(`  - Warning resetting sos_request sequence: ${err.message}`);
      }

      try {
        await queryRunner.query('ALTER SEQUENCE sos_status_history_id_seq RESTART WITH 1;');
        console.log('  - Reset sequence sos_status_history_id_seq to 1');
      } catch (err: any) {
        console.warn(`  - Warning resetting sos_status_history sequence: ${err.message}`);
      }

      await queryRunner.commitTransaction();
      console.log('[ClearSosRequests] 🎉 Completed successfully! All SOS requests and histories cleared.');

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('[ClearSosRequests] ❌ Purge failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

clearSosRequests();
