#!/usr/bin/env node

/**
 * Simple SafeGuard API Test
 * Basic connectivity and health check test
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runSimpleTests() {
  console.log('🧪 SafeGuard Simple API Test');
  console.log('============================');
  
  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      expectedStatus: 200
    },
    {
      name: 'API Info',
      path: '/api',
      expectedStatus: 200
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      console.log(`   URL: ${BASE_URL}${test.path}`);
      
      const response = await makeRequest(test.path);
      
      if (response.status === test.expectedStatus) {
        console.log(`   ✅ PASSED - Status: ${response.status}`);
        if (response.data.status) {
          console.log(`   📊 Server Status: ${response.data.status}`);
        }
        if (response.data.version) {
          console.log(`   📦 Version: ${response.data.version}`);
        }
        if (response.data.uptime) {
          console.log(`   ⏱️  Uptime: ${response.data.uptime.toFixed(2)}s`);
        }
        passed++;
      } else {
        console.log(`   ❌ FAILED - Expected: ${test.expectedStatus}, Got: ${response.status}`);
        console.log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED - Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Hint: Is the server running? Try: npm run dev`);
      }
      failed++;
    }
  }

  console.log('\n============================');
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All basic tests passed! Server is running correctly.');
    console.log('\n📋 Next Steps:');
    console.log('   1. Update your .env file with actual database password');
    console.log('   2. Run full API tests: npm run test:api');
    console.log('   3. Use manual test guide: manual-api-tests.md');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server status.');
  }
  
  console.log('\n✨ Test completed.');
  process.exit(failed > 0 ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user.');
  process.exit(0);
});

// Run the tests
runSimpleTests().catch((error) => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});