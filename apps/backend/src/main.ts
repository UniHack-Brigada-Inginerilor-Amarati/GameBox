import { ConsoleLogger, Logger, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { json, urlencoded } from 'express';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables from .env file
// Try backend directory first, then project root
const backendEnvPath = resolve(__dirname, '../.env');
const rootEnvPath = resolve(__dirname, '../../.env');

if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  // Fallback to default dotenv behavior (looks for .env in current working directory)
  dotenv.config();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3112',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Authorization',
      credentials: true,
    },
    logger: new ConsoleLogger({
      logLevels: (process.env.LOG_LEVEL || 'log')
        .split(',')
        .map((level) => level.trim()) as LogLevel[],
    }),
  });

  // Configure body parser for larger payloads (up to 10MB)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.NEST_PORT || 3111;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`🔧 Environment: ${process.env.NODE_ENV}`);
}

bootstrap();
