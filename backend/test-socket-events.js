#!/usr/bin/env node

/**
 * SafeGuard Visitor Ban Socket.io Real-time Testing Script
 * 
 * This script tests Socket.io real-time events for the visitor ban system
 * including connection, authentication, and event handling.
 */

import { io } from 'socket.io-client';
import readline from 'readline';

console.log('🔧 SafeGuard Visitor Ban Socket.io Testing\n');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJyZXNpZGVudCIsImJ1aWxkaW5nX2lkIjoidGVzdC1idWlsZGluZy1pZCIsImFwYXJ0bWVudF9udW1iZXIiOiIxMDFBIiwiaWF0IjoxNzA1MzE3NjAwLCJleHAiOjE3MDUzMjEyMDB9.test_signature';

// Create readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test data for visitor bans
const testBanData = {
  name: 'Socket Test User',
  phone: '+2348555666777',
  reason: 'Testing real-time ban functionality',
  severity: 'medium'
};

let socket = null;
let isConnected = false;
let testResults = {
  connection: false,
  authentication: false,
  banEvent: false,
  unbanEvent: false,
  banCheckEvent: false,
  errorHandling: false
};

// Socket.io event handlers
function setupSocketHandlers(socket) {
  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to SafeGuard server');
    console.log(`   Socket ID: ${socket.id}`);
    isConnected = true;
    testResults.connection = true;
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Disconnected: ${reason}`);
    isConnected = false;
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Connection Error:', error.message);
    testResults.connection = false;
  });

  // Authentication events
  socket.on('authenticated', (data) => {
    console.log('🔐 Authentication successful');
    console.log('   User data:', JSON.stringify(data, null, 2));
    testResults.authentication = true;
  });

  socket.on('unauthorized', (error) => {
    console.log('🚫 Authentication failed:', error.message);
    testResults.authentication = false;
  });

  // Visitor ban events
  socket.on('visitor:ban', (data) => {
    console.log('🚫 Visitor Ban Event Received:');
    console.log(JSON.stringify(data, null, 2));
    testResults.banEvent = true;
  });

  socket.on('visitor:unban', (data) => {
    console.log('✅ Visitor Unban Event Received:');
    console.log(JSON.stringify(data, null, 2));
    testResults.unbanEvent = true;
  });

  socket.on('visitor:ban-check', (data) => {
    console.log('🔍 Visitor Ban Check Result:');
    console.log(JSON.stringify(data, null, 2));
    testResults.banCheckEvent = true;
  });

  // General events
  socket.on('notification:new', (data) => {
    console.log('🔔 New Notification:');
    console.log(JSON.stringify(data, null, 2));
  });

  socket.on('error', (error) => {
    console.log('⚠️  Socket Error:');
    console.log(JSON.stringify(error, null, 2));
    testResults.errorHandling = true;
  });

  socket.on('validation:error', (error) => {
    console.log('❌ Validation Error:');
    console.log(JSON.stringify(error, null, 2));
  });

  // Building-wide events (if user has security role)
  socket.on('security:alert', (data) => {
    console.log('🚨 Security Alert:');
    console.log(JSON.stringify(data, null, 2));
  });
}

// Test functions
async function testConnection() {
  console.log('\n🔌 Testing Socket.io Connection...');
  
  return new Promise((resolve) => {
    socket = io(SERVER_URL, {
      auth: {
        token: TEST_JWT
      },
      transports: ['websocket', 'polling']
    });

    setupSocketHandlers(socket);

    // Wait for connection or timeout
    setTimeout(() => {
      if (isConnected) {
        console.log('✅ Connection test passed');
        resolve(true);
      } else {
        console.log('❌ Connection test failed');
        resolve(false);
      }
    }, 3000);
  });
}

async function testVisitorBan() {
  console.log('\n🚫 Testing Visitor Ban Event...');
  
  return new Promise((resolve) => {
    if (!isConnected) {
      console.log('❌ Cannot test - not connected');
      resolve(false);
      return;
    }

    // Listen for response
    const timeout = setTimeout(() => {
      console.log('⏰ Ban event test timeout');
      resolve(false);
    }, 5000);

    socket.once('visitor:ban', (response) => {
      clearTimeout(timeout);
      if (response.success) {
        console.log('✅ Visitor ban event test passed');
        console.log('   Ban created:', response.ban?.name || 'Unknown');
        resolve(true);
      } else {
        console.log('❌ Visitor ban event failed:', response.message);
        resolve(false);
      }
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Ban event error:', error.message);
      resolve(false);
    });

    // Emit ban event
    console.log('📤 Emitting visitor ban event...');
    socket.emit('visitor:ban', testBanData);
  });
}

async function testVisitorUnban() {
  console.log('\n✅ Testing Visitor Unban Event...');
  
  return new Promise((resolve) => {
    if (!isConnected) {
      console.log('❌ Cannot test - not connected');
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.log('⏰ Unban event test timeout');
      resolve(false);
    }, 5000);

    socket.once('visitor:unban', (response) => {
      clearTimeout(timeout);
      if (response.success) {
        console.log('✅ Visitor unban event test passed');
        resolve(true);
      } else {
        console.log('❌ Visitor unban event failed:', response.message);
        resolve(false);
      }
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Unban event error:', error.message);
      resolve(false);
    });

    // Emit unban event
    console.log('📤 Emitting visitor unban event...');
    socket.emit('visitor:unban', {
      phone: testBanData.phone,
      reason: 'Testing unban functionality'
    });
  });
}

async function testBanCheck() {
  console.log('\n🔍 Testing Visitor Ban Check Event...');
  
  return new Promise((resolve) => {
    if (!isConnected) {
      console.log('❌ Cannot test - not connected');
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.log('⏰ Ban check test timeout');
      resolve(false);
    }, 5000);

    socket.once('visitor:ban-check', (response) => {
      clearTimeout(timeout);
      if (response.success !== undefined) {
        console.log('✅ Visitor ban check event test passed');
        console.log(`   Is banned: ${response.is_banned_by_user || false}`);
        console.log(`   Building bans: ${response.total_building_bans || 0}`);
        resolve(true);
      } else {
        console.log('❌ Visitor ban check event failed');
        resolve(false);
      }
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Ban check error:', error.message);
      resolve(false);
    });

    // Emit ban check event
    console.log('📤 Emitting visitor ban check event...');
    socket.emit('visitor:ban-check', {
      phone: testBanData.phone
    });
  });
}

async function testErrorHandling() {
  console.log('\n⚠️  Testing Error Handling...');
  
  return new Promise((resolve) => {
    if (!isConnected) {
      console.log('❌ Cannot test - not connected');
      resolve(false);
      return;
    }

    let errorReceived = false;
    
    const timeout = setTimeout(() => {
      if (errorReceived) {
        console.log('✅ Error handling test passed');
        resolve(true);
      } else {
        console.log('❌ Error handling test failed - no error received');
        resolve(false);
      }
    }, 3000);

    socket.once('error', () => {
      errorReceived = true;
    });

    socket.once('validation:error', () => {
      errorReceived = true;
    });

    // Emit invalid data to trigger error
    console.log('📤 Emitting invalid ban data to test error handling...');
    socket.emit('visitor:ban', {
      // Missing required fields to trigger validation error
      invalid: 'data'
    });
  });
}

// Interactive testing menu
function showMenu() {
  console.log('\n📋 Socket.io Test Menu:');
  console.log('1. Test Connection');
  console.log('2. Test Visitor Ban Event');
  console.log('3. Test Visitor Unban Event');
  console.log('4. Test Ban Check Event');
  console.log('5. Test Error Handling');
  console.log('6. Run All Tests');
  console.log('7. Show Test Results');
  console.log('8. Manual Event Testing');
  console.log('9. Disconnect and Exit');
  console.log('\nEnter choice (1-9): ');
}

async function handleMenuChoice(choice) {
  switch (choice) {
    case '1':
      await testConnection();
      break;
    case '2':
      await testVisitorBan();
      break;
    case '3':
      await testVisitorUnban();
      break;
    case '4':
      await testBanCheck();
      break;
    case '5':
      await testErrorHandling();
      break;
    case '6':
      await runAllTests();
      break;
    case '7':
      showTestResults();
      break;
    case '8':
      await manualEventTesting();
      break;
    case '9':
      if (socket) {
        socket.disconnect();
      }
      console.log('👋 Goodbye!');
      process.exit(0);
      break;
    default:
      console.log('❌ Invalid choice. Please try again.');
  }
}

async function runAllTests() {
  console.log('\n🚀 Running All Socket.io Tests...\n');
  
  // Reset test results
  testResults = {
    connection: false,
    authentication: false,
    banEvent: false,
    unbanEvent: false,
    banCheckEvent: false,
    errorHandling: false
  };

  // Run tests in sequence
  await testConnection();
  
  if (isConnected) {
    await testVisitorBan();
    await testBanCheck();
    await testVisitorUnban();
    await testErrorHandling();
  }

  showTestResults();
}

function showTestResults() {
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const results = [
    ['Connection', testResults.connection],
    ['Authentication', testResults.authentication],
    ['Ban Event', testResults.banEvent],
    ['Unban Event', testResults.unbanEvent],
    ['Ban Check Event', testResults.banCheckEvent],
    ['Error Handling', testResults.errorHandling]
  ];

  let passed = 0;
  results.forEach(([test, result]) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
    if (result) passed++;
  });

  console.log('========================');
  console.log(`📈 Overall: ${passed}/${results.length} tests passed`);
  
  if (passed === results.length) {
    console.log('🎉 All Socket.io tests passed! Real-time functionality is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check server logs and ensure proper implementation.');
  }
}

async function manualEventTesting() {
  console.log('\n🔧 Manual Event Testing Mode');
  console.log('You can manually emit events. Available events:');
  console.log('- visitor:ban');
  console.log('- visitor:unban');
  console.log('- visitor:ban-check');
  console.log('\nType "menu" to return to main menu\n');

  const manualRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  manualRl.question('Enter event name: ', (event) => {
    if (event === 'menu') {
      manualRl.close();
      return;
    }

    manualRl.question('Enter JSON data (or press Enter for default): ', (dataStr) => {
      let data = {};
      
      if (dataStr.trim()) {
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          console.log('❌ Invalid JSON. Using default data.');
          data = testBanData;
        }
      } else {
        data = testBanData;
      }

      console.log(`📤 Emitting: ${event}`);
      console.log(`📄 Data: ${JSON.stringify(data, null, 2)}`);
      
      if (socket && isConnected) {
        socket.emit(event, data);
      } else {
        console.log('❌ Not connected to server');
      }

      manualRl.close();
    });
  });
}

// Main execution
async function main() {
  console.log('🎯 SafeGuard Socket.io Real-time Testing');
  console.log('========================================');
  console.log('This tool tests the visitor ban Socket.io events in real-time.');
  console.log('\n⚠️  Prerequisites:');
  console.log('   1. SafeGuard server must be running (npm run dev)');
  console.log('   2. Socket.io should be properly configured');
  console.log('   3. Authentication system should be working');

  if (process.argv.includes('--auto')) {
    // Automated testing
    await runAllTests();
    process.exit(0);
  } else {
    // Interactive testing
    console.log('\n🔄 Starting interactive mode...');
    
    const askQuestion = () => {
      showMenu();
      rl.question('', async (choice) => {
        await handleMenuChoice(choice.trim());
        askQuestion();
      });
    };

    askQuestion();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  if (socket) {
    socket.disconnect();
  }
  rl.close();
  process.exit(0);
});

// Start the testing
main().catch(console.error);