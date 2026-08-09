#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Ensures all required environment variables exist before app startup
 */
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Required environment variables for ReGenX
 */
const REQUIRED_ENV_VARS = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_API_KEY',
  'APPWRITE_PROJECT_ID',
  'DATABASE_URL',
  'NODE_ENV'
];

/**
 * Validates required environment variables
 * @returns {boolean} true if valid, false if missing vars
 */
function validateConfig() {
  const missingVars = [];

  REQUIRED_ENV_VARS.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  console.log('\n🔍 Validating ReGenX Configuration...\n');

  if (missingVars.length === 0) {
    console.log('✅ All required environment variables are set\n');
    return true;
  }

  console.error('❌ Missing environment variables:\n');

  missingVars.forEach((varName) => {
    console.error(`   ⚠️  ${varName}`);
  });

  console.error('\n📝 Please set these variables in your .env file or system environment\n');

  return false;
}

/**
 * Debug helper: shows all config status
 */
function getConfigStatus() {
  console.log('\n📋 Current Configuration Status:\n');

  REQUIRED_ENV_VARS.forEach((varName) => {
    const value = process.env[varName];

    const status = value ? '✅' : '❌';

    const displayValue = value
      ? varName.toLowerCase().includes('key')
        ? '***'
        : value.length > 30
          ? value.substring(0, 30) + '...'
          : value
      : 'NOT SET';

    console.log(`   ${status} ${varName.padEnd(25)} : ${displayValue}`);
  });

  console.log('');
}

/**
 * Exported for use in app startup
 */
export { validateConfig, getConfigStatus, REQUIRED_ENV_VARS };

/**
 * CLI execution handler (Windows-safe)
 */
const __filename = fileURLToPath(import.meta.url);

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

/**
 * Run only when executed directly
 */
if (isDirectRun) {
  console.log('\n🔥 ReGenX Environment Validator Starting...\n');

  const isValid = validateConfig();

  if (process.argv.includes('--verbose')) {
    getConfigStatus();
  }

  // IMPORTANT: CI/CD exit codes
  process.exit(isValid ? 0 : 1);
}