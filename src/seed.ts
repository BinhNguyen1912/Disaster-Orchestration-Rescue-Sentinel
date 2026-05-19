import { NestFactory } from '@nestjs/core';
import { SeederModule } from './infrastructure/database/seeds/seeder.module';
import { SeederService } from './infrastructure/database/seeds/seeder.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(SeederModule);
  const seeder = appContext.get(SeederService);
  
  try {
    await seeder.seed();
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed!', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap();
