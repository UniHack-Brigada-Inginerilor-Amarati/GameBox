import { s3Storage } from '@payloadcms/storage-s3';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { payloadCloudPlugin } from '@payloadcms/payload-cloud';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Games } from './collections/Games';
import { Abilities } from './collections/Abilities';
import { Tournaments } from './collections/Tournaments';
import { Missions } from './collections/Missions';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const getCorsOrigins = (): string[] => {
  const corsEnv = process.env.CORS_ORIGINS;
  if (corsEnv) {
    return corsEnv.split(',').map(origin => origin.trim());
  }
  return [];
};

const getCsrfOrigins = (): string[] => {
  const csrfEnv = process.env.CSRF_ORIGINS;
  if (csrfEnv) {
    return csrfEnv.split(',').map(origin => origin.trim());
  }
  return [];
};

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  cors: getCorsOrigins(),
  csrf: getCsrfOrigins(),
  collections: [Users, Media, Games, Abilities, Tournaments, Missions],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    schemaName: process.env.PAYLOAD_SCHEMA || 'payload',
    push: process.env.NODE_ENV === 'development',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        }
      },
      bucket: process.env.S3_BUCKET as string,
      config: {
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
        },
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT as string,
      },  
    }),
  ],
  logger: {
    options: {
      level: 'info',
    },
    destination: process.stdout,
  },
});
