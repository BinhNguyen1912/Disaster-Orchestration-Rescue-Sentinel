import { DataSource } from 'typeorm';
import * as Entities from '../src/infrastructure/database/entities';
import * as fs from 'fs';
import * as path from 'path';

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

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123123',
    database: process.env.DB_NAME || 'rescue_system',
    entities: (Object.values(Entities) as any[]).filter(
      (v) => typeof v === 'function',
    ),
    logging: true, // Enable full query logging
  });

  await dataSource.initialize();
  console.log("--- TypeORM DataSource initialized ---");

  const recipientRepo = dataSource.getRepository(Entities.NotificationRecipientEntity);

  console.log("\n--- Testing FIND with undefined userId ---");
  try {
    const results = await recipientRepo.find({
      where: {
        id: 94,
        userId: undefined
      }
    });
    console.log("Find results length:", results.length);
  } catch (err) {
    console.error("Find error:", err);
  }

  console.log("\n--- Testing UPDATE with undefined userId ---");
  try {
    const updateResult = await recipientRepo.update(
      { notificationId: 7, userId: undefined },
      { status: 'READ', readAt: new Date() }
    );
    console.log("Update result:", updateResult);
  } catch (err) {
    console.error("Update error:", err);
  }

  await dataSource.destroy();
}

main().catch(console.error);
