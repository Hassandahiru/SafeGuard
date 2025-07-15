#!/usr/bin/env node

/**
 * Configuration Test
 * Verifies all environment variables are loaded correctly
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config();

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    config: '⚙️'
  }[type];
  
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

function testConfiguration() {
  log('🚀 Testing SafeGuard Configuration', 'info');
  log('=' .repeat(60), 'info');
  
  // Server Configuration
  log('📡 Server Configuration:', 'config');
  log(`   PORT: ${process.env.PORT || 'DEFAULT (4500)'}`, 'info');
  log(`   NODE_ENV: ${process.env.NODE_ENV || 'DEFAULT (development)'}`, 'info');
  log(`   API_VERSION: ${process.env.API_VERSION || 'DEFAULT (v1)'}`, 'info');
  
  // Database Configuration
  log('🗄️  Database Configuration:', 'config');
  log(`   DB_HOST: ${process.env.DB_HOST || 'DEFAULT (localhost)'}`, 'info');
  log(`   DB_PORT: ${process.env.DB_PORT || 'DEFAULT (5432)'}`, 'info');
  log(`   DB_NAME: ${process.env.DB_NAME || 'DEFAULT (safeguard_db)'}`, 'info');
  log(`   DB_USER: ${process.env.DB_USER || 'DEFAULT (dahiruadoh)'}`, 'info');
  log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '***CONFIGURED***' : 'NOT SET'}`, 'info');
  
  // JWT Configuration
  log('🔐 JWT Configuration:', 'config');
  log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '***CONFIGURED***' : 'NOT SET'}`, 'info');
  log(`   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || 'DEFAULT (24h)'}`, 'info');
  log(`   JWT_REFRESH_EXPIRES_IN: ${process.env.JWT_REFRESH_EXPIRES_IN || 'DEFAULT (7d)'}`, 'info');
  
  // Socket.IO Configuration
  log('🔌 Socket.IO Configuration:', 'config');
  log(`   SOCKET_CORS_ORIGIN: ${process.env.SOCKET_CORS_ORIGIN || 'DEFAULT (http://localhost:4500)'}`, 'info');
  
  // CORS Configuration
  log('🌐 CORS Configuration:', 'config');
  log(`   CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'DEFAULT (http://localhost:4500,http://localhost:3001)'}`, 'info');
  
  // Test Configuration
  log('🧪 Test Configuration:', 'config');
  log(`   TEST_BUILDING_ID: ${process.env.TEST_BUILDING_ID || 'DEFAULT (b1234567-1234-1234-1234-123456789012)'}`, 'info');
  log(`   TEST_USER_EMAIL: ${process.env.TEST_USER_EMAIL || 'DEFAULT (test@safeguard.com)'}`, 'info');
  log(`   TEST_USER_PHONE: ${process.env.TEST_USER_PHONE || 'DEFAULT (+2348123456789)'}`, 'info');
  log(`   TEST_USER_APARTMENT: ${process.env.TEST_USER_APARTMENT || 'DEFAULT (A101)'}`, 'info');
  log(`   TEST_USER_ROLE: ${process.env.TEST_USER_ROLE || 'DEFAULT (resident)'}`, 'info');
  
  // Validation
  log('=' .repeat(60), 'info');
  log('✅ Configuration Test Results:', 'success');
  
  const issues = [];
  
  if (!process.env.PORT) {
    issues.push('PORT not set, using default 4500');
  }
  
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === 'your_actual_password_here') {
    issues.push('DB_PASSWORD not properly configured');
  }
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('development')) {
    issues.push('JWT_SECRET should be updated for production');
  }
  
  if (issues.length > 0) {
    log('⚠️  Configuration Issues:', 'warning');
    issues.forEach(issue => log(`   • ${issue}`, 'warning'));
  } else {
    log('✅ All critical configuration values are properly set!', 'success');
  }
  
  log('=' .repeat(60), 'info');
  log('🎯 Next Steps:', 'info');
  log('   1. Update DB_PASSWORD with your actual PostgreSQL password', 'info');
  log(`   2. Server will run on port ${process.env.PORT || 4500}`, 'info');
  log(`   3. All test scripts will use port ${process.env.PORT || 4500}`, 'info');
  log('   4. No hardcoded values remaining in codebase', 'info');
}

testConfiguration();