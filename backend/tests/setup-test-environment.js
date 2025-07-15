#!/usr/bin/env node

/**
 * Test Environment Setup Script
 * Sets up the test environment with required database records and configurations
 */

import pg from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const { Client } = pg;

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    db: '🗄️'
  }[type];
  
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

async function connectToDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'safeguard_db',
    user: process.env.DB_USER || 'dahiruadoh',
    password: process.env.DB_PASSWORD || 'password123'
  });

  await client.connect();
  return client;
}

async function createTestBuilding() {
  log('Creating test building...', 'db');
  
  const client = await connectToDatabase();
  
  try {
    const buildingId = process.env.TEST_BUILDING_ID || 'b1234567-1234-1234-1234-123456789012';
    
    // Check if building already exists
    const existingBuilding = await client.query(
      'SELECT id, name FROM buildings WHERE id = $1',
      [buildingId]
    );
    
    if (existingBuilding.rows.length > 0) {
      log(`Building already exists: ${existingBuilding.rows[0].name}`, 'success');
      return buildingId;
    }
    
    // Create new building
    await client.query(
      `INSERT INTO buildings (id, name, address, city, state, country, license_count, license_used, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        buildingId,
        'Test Building',
        '123 Test Street',
        'Lagos',
        'Lagos',
        'Nigeria',
        100,
        0,
        true
      ]
    );
    
    log(`Test building created successfully (ID: ${buildingId})`, 'success');
    return buildingId;
    
  } finally {
    await client.end();
  }
}

async function cleanupTestData() {
  log('Cleaning up existing test data...', 'db');
  
  const client = await connectToDatabase();
  
  try {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@safeguard.com';
    const testPhone = process.env.TEST_USER_PHONE || '+2348123456789';
    
    // Delete test user and related data
    await client.query('DELETE FROM users WHERE email = $1 OR phone = $2', [testEmail, testPhone]);
    
    // Delete test visitors
    await client.query('DELETE FROM visitors WHERE phone = $1', [testPhone]);
    
    // Delete test visitor bans
    await client.query('DELETE FROM visitor_bans WHERE phone = $1', [testPhone]);
    
    log('Test data cleaned up successfully', 'success');
    
  } finally {
    await client.end();
  }
}

async function verifyDatabaseSchema() {
  log('Verifying database schema...', 'db');
  
  const client = await connectToDatabase();
  
  try {
    // Check if required tables exist
    const requiredTables = [
      'buildings',
      'users',
      'visitors',
      'visits',
      'visitor_bans',
      'frequent_visitors',
      'notifications'
    ];
    
    for (const table of requiredTables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      if (!result.rows[0].exists) {
        throw new Error(`Required table '${table}' does not exist`);
      }
    }
    
    log('Database schema verification successful', 'success');
    
  } finally {
    await client.end();
  }
}

async function setupTestEnvironment() {
  log('🚀 Setting up SafeGuard Test Environment', 'info');
  log('=' .repeat(50), 'info');
  
  try {
    // Step 1: Verify database schema
    await verifyDatabaseSchema();
    
    // Step 2: Clean up existing test data
    await cleanupTestData();
    
    // Step 3: Create test building
    const buildingId = await createTestBuilding();
    
    log('=' .repeat(50), 'info');
    log('✅ Test environment setup completed successfully!', 'success');
    log('=' .repeat(50), 'info');
    
    log('🎯 Test Environment Ready:', 'success');
    log(`   Building ID: ${buildingId}`, 'info');
    log(`   Test User Email: ${process.env.TEST_USER_EMAIL || 'test@safeguard.com'}`, 'info');
    log(`   Test User Phone: ${process.env.TEST_USER_PHONE || '+2348123456789'}`, 'info');
    log(`   Server Port: ${process.env.PORT || 4500}`, 'info');
    
    log('', 'info');
    log('🧪 Ready to run tests:', 'info');
    log('   npm run test:config', 'info');
    log('   npm run test:auth', 'info');
    log('   npm run test:api', 'info');
    log('   open tests/socket-test.html', 'info');
    
  } catch (error) {
    log('=' .repeat(50), 'error');
    log(`❌ Test environment setup failed: ${error.message}`, 'error');
    log('=' .repeat(50), 'error');
    
    log('🔧 Troubleshooting:', 'info');
    log('   1. Check database connection settings in .env', 'info');
    log('   2. Ensure PostgreSQL is running', 'info');
    log('   3. Verify database schema is up to date', 'info');
    log('   4. Check database user permissions', 'info');
    
    throw error;
  }
}

async function main() {
  try {
    await setupTestEnvironment();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test environment setup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Setup interrupted by user.');
  process.exit(0);
});

main();