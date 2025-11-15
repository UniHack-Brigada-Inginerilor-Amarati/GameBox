/**
 * Simple script to test if the Riot API key is loaded correctly
 * Run with: npx ts-node apps/backend/src/app/riot/test-api-key.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Load environment variables
const backendEnvPath = resolve(__dirname, '../.env');
const rootEnvPath = resolve(__dirname, '../../../.env');

if (existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
  console.log('✅ Loaded .env from backend directory');
} else if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
  console.log('✅ Loaded .env from project root');
} else {
  dotenv.config();
  console.log('⚠️  Using default dotenv behavior');
}

const apiKey = process.env.RIOT_API_KEY;

if (apiKey) {
  console.log('✅ RIOT_API_KEY is loaded');
  console.log(`   Key starts with: ${apiKey.substring(0, 10)}...`);
  console.log(`   Key length: ${apiKey.length} characters`);
} else {
  console.log('❌ RIOT_API_KEY is NOT loaded');
  console.log('   Please check your .env file');
  process.exit(1);
}

