#!/usr/bin/env node

/**
 * Cleanup Old Test Files
 * Removes old test files from the backend root directory
 */

import { unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    cleanup: '🧹'
  }[type];
  
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

async function removeFileIfExists(filePath) {
  try {
    await unlink(filePath);
    log(`Removed: ${path.basename(filePath)}`, 'cleanup');
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log(`File not found: ${path.basename(filePath)}`, 'warning');
      return false;
    } else {
      log(`Error removing ${path.basename(filePath)}: ${error.message}`, 'error');
      return false;
    }
  }
}

async function cleanupOldTests() {
  log('🧹 Cleaning up old test files from backend root directory', 'info');
  log('=' .repeat(60), 'info');
  
  const backendRoot = path.resolve(__dirname, '..', '..');
  
  // List of old test files to remove
  const oldTestFiles = [
    'test-config.js',
    'test-auth-complete.js',
    'test-with-auth.js',
    'socket-test-with-auth.html',
    'quick-auth-test.js',
    'simple-auth-test.js',
    'fix-auth-and-test.js',
    'create-building.sql',
    'create-test-building.sql',
    'fix-path.sh',
    'fix-path-direct.sh',
    'PATH-FIX-INSTRUCTIONS.md'
  ];
  
  let removedCount = 0;
  
  for (const fileName of oldTestFiles) {
    const filePath = path.join(backendRoot, fileName);
    const removed = await removeFileIfExists(filePath);
    if (removed) {
      removedCount++;
    }
  }
  
  log('=' .repeat(60), 'info');
  log(`✅ Cleanup completed: ${removedCount} files removed`, 'success');
  log('', 'info');
  log('🎯 New test structure:', 'info');
  log('   tests/manual/          - Manual and interactive tests', 'info');
  log('   tests/integration/     - API and integration tests', 'info');
  log('   tests/scripts/         - Setup and utility scripts', 'info');
  log('   tests/utils/           - Test helper utilities', 'info');
  log('   tests/run-all-tests.js - Main test runner', 'info');
  log('', 'info');
  log('🚀 Run tests with:', 'info');
  log('   npm test              - Run all tests', 'info');
  log('   npm run test:config   - Test configuration', 'info');
  log('   npm run test:auth     - Test authentication', 'info');
  log('   npm run test:api      - Test API endpoints', 'info');
  log('   npm run test:setup    - Setup test environment', 'info');
}

async function main() {
  try {
    await cleanupOldTests();
    process.exit(0);
  } catch (error) {
    log(`❌ Cleanup failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();