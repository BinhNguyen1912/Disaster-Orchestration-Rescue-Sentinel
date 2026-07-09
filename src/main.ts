import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedisIoAdapter } from './modules/websocket/adapters/redis-io.adapter';
import { ClassSerializerInterceptor } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WebSocket adapter — sử dụng Redis Adapter để đồng bộ hóa các instances
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // API versioning — all REST routes prefixed with /api/v1
  // Swagger UI mounted at /api is excluded from the prefix
  app.setGlobalPrefix('api/v1', { exclude: ['api', 'api/(.*)'] });

  const config = new DocumentBuilder()
    .setTitle('Rescue System API')
    .setDescription('API documentation for the Disaster Rescue System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(process.env.PORT ?? 8585);
  console.log('API v1    : http://localhost:8585/api/v1');
  console.log('Swagger   : http://localhost:8585/api');
}
bootstrap();
