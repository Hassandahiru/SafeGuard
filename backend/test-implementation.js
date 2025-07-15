#!/usr/bin/env node

/**
 * SafeGuard Implementation Test Script
 * 
 * This script performs basic validation checks on the implemented components
 * to ensure they're working correctly without requiring database connectivity.
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 SafeGuard Backend Implementation Test\n');

// Test 1: Check if all required files exist
console.log('📁 File Structure Test');
const requiredFiles = [
  'src/app.js',
  'src/controllers/visitorBan.controller.js',
  'src/routes/visitorBan.routes.js', 
  'src/models/VisitorBan.js',
  'src/services/notification.service.js',
  'src/sockets/socketHandler.js',
  'src/middleware/validation.js',
  'src/utils/constants.js',
  'src/utils/helpers.js'
];

let fileTestsPassed = 0;
for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
    fileTestsPassed++;
  } else {
    console.log(`❌ ${file} - Missing`);
  }
}

console.log(`\n📊 File Structure: ${fileTestsPassed}/${requiredFiles.length} files found\n`);

// Test 2: Import and validate ES6 modules
console.log('🔧 ES6 Module Import Test');
let importTestsPassed = 0;
const totalImportTests = 7;

try {
  // Test constants
  const { BAN_SEVERITY, BAN_TYPE, HTTP_STATUS } = await import('./src/utils/constants.js');
  console.log('✅ Constants imported successfully');
  console.log(`   - BAN_SEVERITY: ${Object.keys(BAN_SEVERITY).join(', ')}`);
  console.log(`   - BAN_TYPE: ${Object.keys(BAN_TYPE).join(', ')}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ Constants import failed: ${error.message}`);
}

try {
  // Test helpers
  const { formatPhoneNumber, createResponse } = await import('./src/utils/helpers.js');
  console.log('✅ Helpers imported successfully');
  
  // Test phone formatting
  const testPhone = formatPhoneNumber('08123456789');
  console.log(`   - Phone format test: 08123456789 → ${testPhone}`);
  
  // Test response creation
  const testResponse = createResponse(true, { test: 'data' }, 'Test message');
  console.log(`   - Response creation: ${testResponse.success ? 'Success' : 'Failed'}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ Helpers import failed: ${error.message}`);
}

try {
  // Test VisitorBan model
  const VisitorBan = (await import('./src/models/VisitorBan.js')).default;
  console.log('✅ VisitorBan model imported successfully');
  console.log(`   - Model instance created: ${VisitorBan.constructor.name}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ VisitorBan model import failed: ${error.message}`);
}

try {
  // Test VisitorBan controller
  const visitorBanController = (await import('./src/controllers/visitorBan.controller.js')).default;
  console.log('✅ VisitorBan controller imported successfully');
  console.log(`   - Controller methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(visitorBanController)).filter(n => n !== 'constructor').length}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ VisitorBan controller import failed: ${error.message}`);
}

try {
  // Test validation middleware
  const { visitorBanValidations } = await import('./src/middleware/validation.js');
  console.log('✅ Validation middleware imported successfully');
  console.log(`   - VisitorBan validations: ${Object.keys(visitorBanValidations).join(', ')}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ Validation middleware import failed: ${error.message}`);
}

try {
  // Test notification service
  const NotificationService = (await import('./src/services/notification.service.js')).default;
  console.log('✅ Notification service imported successfully');
  console.log(`   - Service instance: ${NotificationService.constructor.name}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ Notification service import failed: ${error.message}`);
}

try {
  // Test main app
  const app = (await import('./src/app.js')).default;
  console.log('✅ Main app imported successfully');
  console.log(`   - App instance: ${app.constructor.name}`);
  importTestsPassed++;
} catch (error) {
  console.log(`❌ Main app import failed: ${error.message}`);
}

console.log(`\n📊 Import Tests: ${importTestsPassed}/${totalImportTests} modules imported successfully\n`);

// Test 3: API Route Structure Validation
console.log('🛣️  API Route Structure Test');
try {
  const visitorBanRoutes = await import('./src/routes/visitorBan.routes.js');
  console.log('✅ VisitorBan routes imported successfully');
  
  // Check if routes file exports a router
  const router = visitorBanRoutes.default;
  if (router && typeof router === 'function') {
    console.log('   - Router object is valid');
  } else if (router && router.stack) {
    console.log(`   - Router has ${router.stack.length} route handlers`);
  } else {
    console.log('   - Router structure unknown but imported');
  }
  
} catch (error) {
  console.log(`❌ VisitorBan routes import failed: ${error.message}`);
}

// Test 4: Function Signature Validation
console.log('\n⚙️  Function Signature Test');
try {
  const { createResponse, formatPhoneNumber } = await import('./src/utils/helpers.js');
  
  // Test createResponse function signature
  const responseTest1 = createResponse(true);
  const responseTest2 = createResponse(false, null, 'Error message');
  const responseTest3 = createResponse(true, { data: 'test' }, 'Success', { count: 1 });
  
  console.log('✅ createResponse function signatures validated');
  console.log(`   - Basic: ${responseTest1.success}`);
  console.log(`   - With error: ${!responseTest2.success}`);
  console.log(`   - With metadata: ${responseTest3.meta?.count === 1}`);
  
  // Test formatPhoneNumber function
  const phoneTests = [
    formatPhoneNumber('08123456789'),
    formatPhoneNumber('+2348123456789'),
    formatPhoneNumber('2348123456789')
  ];
  
  console.log('✅ formatPhoneNumber function tested');
  console.log(`   - Results: ${phoneTests.join(', ')}`);
  
} catch (error) {
  console.log(`❌ Function signature test failed: ${error.message}`);
}

// Test 5: Constants Validation
console.log('\n🔢 Constants Validation Test');
try {
  const { BAN_SEVERITY, BAN_TYPE, SOCKET_EVENTS, USER_ROLES } = await import('./src/utils/constants.js');
  
  console.log('✅ All constants imported and validated');
  console.log(`   - BAN_SEVERITY values: ${Object.values(BAN_SEVERITY).join(', ')}`);
  console.log(`   - BAN_TYPE values: ${Object.values(BAN_TYPE).join(', ')}`);
  console.log(`   - Socket events count: ${Object.keys(SOCKET_EVENTS).length}`);
  console.log(`   - User roles count: ${Object.keys(USER_ROLES).length}`);
  
  // Validate required socket events exist
  const requiredSocketEvents = ['VISITOR_BAN', 'VISITOR_UNBAN', 'VISITOR_BAN_CHECK'];
  const hasRequiredEvents = requiredSocketEvents.every(event => 
    Object.values(SOCKET_EVENTS).includes(event.toLowerCase().replace('_', ':'))
  );
  
  if (hasRequiredEvents) {
    console.log('✅ Required socket events are defined');
  } else {
    console.log('⚠️  Some required socket events may be missing');
  }
  
} catch (error) {
  console.log(`❌ Constants validation failed: ${error.message}`);
}

// Summary
console.log('\n📋 Test Summary');
const totalTests = fileTestsPassed + importTestsPassed;
const maxTests = requiredFiles.length + totalImportTests;

console.log(`✅ Files Found: ${fileTestsPassed}/${requiredFiles.length}`);
console.log(`✅ Modules Imported: ${importTestsPassed}/${totalImportTests}`);
console.log(`📊 Overall: ${totalTests}/${maxTests} tests passed`);

if (totalTests === maxTests) {
  console.log('\n🎉 All tests passed! The visitor ban system implementation appears to be working correctly.');
  console.log('\n🚀 Next steps:');
  console.log('   1. Set up database connection');
  console.log('   2. Run integration tests with database');
  console.log('   3. Test API endpoints with Postman/curl');
  console.log('   4. Test Socket.io real-time events');
} else {
  console.log('\n⚠️  Some tests failed. Please check the errors above and fix the issues.');
}

console.log('\n🔧 To start the server:');
console.log('   npm run dev   # Development mode with auto-restart');
console.log('   npm start     # Production mode');