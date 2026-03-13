import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable cookie parser for JWT authentication via cookies
  app.use(cookieParser());

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert primitive types automatically
      },
    }),
  );

  // Enable CORS for frontend communication
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:2999',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('FlixZone Content Service API')
    .setDescription('API for managing movies, TV shows, episodes, and ratings')
    .setVersion('1.0')
    .addTag('Movies', 'Movie management endpoints')
    .addTag('TV Shows', 'TV show management endpoints')
    .addTag('Ratings', 'User rating endpoints')
    .addTag('Health', 'Health check endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token from Users Service',
        in: 'header',
      },
      'JWT-auth', // This name must match @ApiBearerAuth() decorator
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT') || 3002;
  await app.listen(port);

  console.log(`🎬 Content Service is running on: http://localhost:${port}`);
  console.log(`📚 Swagger API docs available at: http://localhost:${port}/api`);
}
bootstrap();
