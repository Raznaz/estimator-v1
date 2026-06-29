import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI: UI на /docs, JSON-схема на /docs-json
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Planning Poker API')
    .setDescription('REST API инструмента командной оценки тикетов')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Регистрация, вход, ротация и отзыв токенов')
    .addTag('users', 'Профиль пользователя, пароль и аватары')
    .addTag('rooms', 'Создание комнат и поиск по коду')
    .addTag('health', 'Проверка доступности сервиса')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Хостинги (Render и др.) передают порт через PORT; слушаем на 0.0.0.0.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 API запущен на порту ${port}`);
}

bootstrap();
