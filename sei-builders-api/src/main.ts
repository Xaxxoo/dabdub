import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { API_PREFIX, APP_NAME } from './common/constants/app.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // needed for GitHub webhook signature verification
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;
  const env = config.get<string>('env') ?? 'development';

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Security middleware
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: env === 'production',
    }),
  );

  // Cookie parser (for httpOnly refresh token cookie)
  app.use(cookieParser());

  // CORS
  const allowedOrigins = (config.get<string>('app.corsOrigins') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  // Global prefix + versioning
  app.setGlobalPrefix(API_PREFIX);
  // No API versioning in the URL; prefix handled via setGlobalPrefix

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: false,
      transform: true, // auto-transform to class instances
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // Swagger docs (non-production or if explicitly enabled)
  const swaggerEnabled =
    env !== 'production' ||
    config.get<boolean>('swagger.enabled') === true;

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`${APP_NAME} API`)
      .setDescription('Production-grade REST API for the SEI Builders Hub platform')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addCookieAuth('sei_refresh_token')
      .addTag('Health')
      .addTag('Authentication')
      .addTag('Users')
      .addTag('Organizations')
      .addTag('Projects')
      .addTag('Repositories')
      .addTag('Contributors')
      .addTag('Opportunities')
      .addTag('Applications')
      .addTag('GitHub')
      .addTag('Notifications')
      .addTag('Activity')
      .addTag('Analytics')
      .addTag('Admin')
      .addTag('Permissions')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  const url = await app.getUrl();
  const logger = app.get(Logger);
  logger.log(`🚀 ${APP_NAME} API running on ${url}/${API_PREFIX}`);
  if (swaggerEnabled) {
    logger.log(`📚 Swagger docs available at ${url}/docs`);
  }
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
