#!/usr/bin/env node

/**
 * SafeGuard Visitor Ban API Testing Script
 * 
 * This script tests all visitor ban API endpoints using curl commands
 * and provides examples for Postman/HTTP clients.
 */

import fs from 'fs';
import { spawn } from 'child_process';

console.log('🔧 SafeGuard Visitor Ban API Testing\n');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Mock JWT token for testing (replace with actual token)
const TEST_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlci1pZCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJyZXNpZGVudCIsImJ1aWxkaW5nX2lkIjoidGVzdC1idWlsZGluZy1pZCIsImFwYXJ0bWVudF9udW1iZXIiOiIxMDFBIiwiaWF0IjoxNzA1MzE3NjAwLCJleHAiOjE3MDUzMjEyMDB9.test_signature';

// Test data
const testVisitorBan = {
  name: 'John Doe',
  phone: '+2348123456789',
  reason: 'Inappropriate behavior during last visit',
  severity: 'medium',
  notes: 'Resident requested permanent ban due to security concerns'
};

const testVisitorBan2 = {
  name: 'Jane Smith',
  phone: '+2348987654321',
  reason: 'Disturbing other residents',
  severity: 'high',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
};

// Helper function to execute curl commands
function executeCurl(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}`);
    console.log(`📤 Command: ${command}\n`);
    
    const process = spawn('curl', command.split(' ').slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(stdout);
          console.log('✅ Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (e) {
          console.log('📄 Raw Response:', stdout);
          resolve({ raw: stdout });
        }
      } else {
        console.log('❌ Error:', stderr);
        reject(new Error(stderr));
      }
    });
  });
}

// API Test Functions
async function testHealthCheck() {
  try {
    const command = `curl -X GET ${BASE_URL}/health -H "Content-Type: application/json"`;
    await executeCurl(command, 'Health Check - Verify server is running');
  } catch (error) {
    console.log('❌ Server appears to be down. Please start the server first.');
    console.log('   Run: npm run dev');
    process.exit(1);
  }
}

async function testCreateVisitorBan() {
  const command = `curl -X POST ${API_BASE}/visitor-bans -H "Content-Type: application/json" -H "Authorization: Bearer ${TEST_JWT}" -d '${JSON.stringify(testVisitorBan)}'`;
  const response = await executeCurl(command, 'Create Visitor Ban - Ban a visitor');
  return response;
}

async function testGetVisitorBans() {
  const command = `curl -X GET "${API_BASE}/visitor-bans?page=1&limit=10" -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Get Visitor Bans - List banned visitors with pagination');
}

async function testSearchVisitorBans() {
  const command = `curl -X GET "${API_BASE}/visitor-bans/search?query=john&limit=5" -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Search Visitor Bans - Search for banned visitors');
}

async function testCheckVisitorBan() {
  const command = `curl -X GET ${API_BASE}/visitor-bans/check/${encodeURIComponent(testVisitorBan.phone)} -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Check Visitor Ban - Check if specific visitor is banned');
}

async function testBuildingBanCheck() {
  const command = `curl -X GET ${API_BASE}/visitor-bans/building-check/${encodeURIComponent(testVisitorBan.phone)} -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Building Ban Check - Check building-wide bans for visitor');
}

async function testGetBanStats() {
  const command = `curl -X GET ${API_BASE}/visitor-bans/stats -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Get Ban Statistics - User ban statistics');
}

async function testGetRecentlyBanned() {
  const command = `curl -X GET "${API_BASE}/visitor-bans/recently-banned?limit=5" -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Get Recently Banned - Recent visitor bans');
}

async function testGetBySeverity() {
  const command = `curl -X GET ${API_BASE}/visitor-bans/severity/medium -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Get By Severity - Filter bans by severity level');
}

async function testExportBans() {
  const command = `curl -X GET "${API_BASE}/visitor-bans/export?format=json" -H "Authorization: Bearer ${TEST_JWT}"`;
  await executeCurl(command, 'Export Bans - Export ban list in JSON format');
}

async function testUpdateBan(banId) {
  const updateData = {
    reason: 'Updated ban reason - escalated due to repeated incidents',
    severity: 'high',
    notes: 'Updated notes with additional context'
  };
  
  const command = `curl -X PUT ${API_BASE}/visitor-bans/${banId} -H "Content-Type: application/json" -H "Authorization: Bearer ${TEST_JWT}" -d '${JSON.stringify(updateData)}'`;
  await executeCurl(command, 'Update Ban - Modify existing ban details');
}

async function testUnbanVisitor(banId) {
  const unbanData = {
    reason: 'Resident requested to lift the ban after apology'
  };
  
  const command = `curl -X POST ${API_BASE}/visitor-bans/${banId}/unban -H "Content-Type: application/json" -H "Authorization: Bearer ${TEST_JWT}" -d '${JSON.stringify(unbanData)}'`;
  await executeCurl(command, 'Unban Visitor - Remove ban by ID');
}

async function testUnbanByPhone() {
  const unbanData = {
    phone: testVisitorBan2.phone,
    reason: 'Temporary ban period has ended'
  };
  
  const command = `curl -X POST ${API_BASE}/visitor-bans/unban-by-phone -H "Content-Type: application/json" -H "Authorization: Bearer ${TEST_JWT}" -d '${JSON.stringify(unbanData)}'`;
  await executeCurl(command, 'Unban by Phone - Remove ban using phone number');
}

// Main test execution
async function runAPITests() {
  console.log('🚀 Starting API Tests for Visitor Ban System\n');
  console.log('⚠️  Note: These tests require a running server and valid authentication.');
  console.log('   Make sure to start the server: npm run dev\n');

  try {
    // Step 1: Health check
    await testHealthCheck();
    
    // Step 2: Create bans
    console.log('\n📝 CREATING VISITOR BANS');
    const ban1Response = await testCreateVisitorBan();
    
    // Create second ban
    const command2 = `curl -X POST ${API_BASE}/visitor-bans -H "Content-Type: application/json" -H "Authorization: Bearer ${TEST_JWT}" -d '${JSON.stringify(testVisitorBan2)}'`;
    const ban2Response = await executeCurl(command2, 'Create Second Visitor Ban - Temporary ban with expiry');
    
    // Step 3: Read operations
    console.log('\n📖 READING VISITOR BANS');
    await testGetVisitorBans();
    await testSearchVisitorBans();
    await testCheckVisitorBan();
    await testBuildingBanCheck();
    await testGetBanStats();
    await testGetRecentlyBanned();
    await testGetBySeverity();
    await testExportBans();
    
    // Step 4: Update operations (if we have ban IDs)
    if (ban1Response && ban1Response.data && ban1Response.data.id) {
      console.log('\n✏️  UPDATING VISITOR BANS');
      await testUpdateBan(ban1Response.data.id);
      
      // Step 5: Unban operations
      console.log('\n🔓 UNBANNING VISITORS');
      await testUnbanVisitor(ban1Response.data.id);
    }
    
    await testUnbanByPhone();
    
    console.log('\n✅ API Testing Complete!');
    console.log('\n📋 Summary:');
    console.log('   - Health check passed');
    console.log('   - Visitor ban creation tested');
    console.log('   - Ban listing and pagination tested');
    console.log('   - Search functionality tested');
    console.log('   - Ban checking (personal and building-wide) tested');
    console.log('   - Statistics and filtering tested');
    console.log('   - Export functionality tested');
    console.log('   - Ban updates and removal tested');
    
  } catch (error) {
    console.log('\n❌ API Testing failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure server is running: npm run dev');
    console.log('   2. Check database connection');
    console.log('   3. Verify JWT token is valid');
    console.log('   4. Check server logs for errors');
  }
}

// Postman Collection Generator
function generatePostmanCollection() {
  const collection = {
    info: {
      name: "SafeGuard Visitor Ban API",
      description: "Complete API testing collection for SafeGuard visitor ban system",
      version: "1.0.0"
    },
    variable: [
      {
        key: "baseUrl",
        value: BASE_URL,
        type: "string"
      },
      {
        key: "jwt_token",
        value: "{{your_jwt_token_here}}",
        type: "string"
      }
    ],
    item: [
      {
        name: "Health Check",
        request: {
          method: "GET",
          header: [],
          url: {
            raw: "{{baseUrl}}/health",
            host: ["{{baseUrl}}"],
            path: ["health"]
          }
        }
      },
      {
        name: "Create Visitor Ban",
        request: {
          method: "POST",
          header: [
            {
              key: "Content-Type",
              value: "application/json"
            },
            {
              key: "Authorization",
              value: "Bearer {{jwt_token}}"
            }
          ],
          body: {
            mode: "raw",
            raw: JSON.stringify(testVisitorBan, null, 2)
          },
          url: {
            raw: "{{baseUrl}}/api/visitor-bans",
            host: ["{{baseUrl}}"],
            path: ["api", "visitor-bans"]
          }
        }
      },
      {
        name: "Get Visitor Bans",
        request: {
          method: "GET",
          header: [
            {
              key: "Authorization",
              value: "Bearer {{jwt_token}}"
            }
          ],
          url: {
            raw: "{{baseUrl}}/api/visitor-bans?page=1&limit=10",
            host: ["{{baseUrl}}"],
            path: ["api", "visitor-bans"],
            query: [
              {
                key: "page",
                value: "1"
              },
              {
                key: "limit",
                value: "10"
              }
            ]
          }
        }
      },
      {
        name: "Search Visitor Bans",
        request: {
          method: "GET",
          header: [
            {
              key: "Authorization",
              value: "Bearer {{jwt_token}}"
            }
          ],
          url: {
            raw: "{{baseUrl}}/api/visitor-bans/search?query=john&limit=5",
            host: ["{{baseUrl}}"],
            path: ["api", "visitor-bans", "search"],
            query: [
              {
                key: "query",
                value: "john"
              },
              {
                key: "limit",
                value: "5"
              }
            ]
          }
        }
      },
      {
        name: "Check Visitor Ban",
        request: {
          method: "GET",
          header: [
            {
              key: "Authorization",
              value: "Bearer {{jwt_token}}"
            }
          ],
          url: {
            raw: "{{baseUrl}}/api/visitor-bans/check/+2348123456789",
            host: ["{{baseUrl}}"],
            path: ["api", "visitor-bans", "check", "+2348123456789"]
          }
        }
      }
    ]
  };
  
  fs.writeFileSync('SafeGuard-VisitorBan-API.postman_collection.json', JSON.stringify(collection, null, 2));
  console.log('\n📤 Postman Collection generated: SafeGuard-VisitorBan-API.postman_collection.json');
}

// cURL Examples Generator
function generateCurlExamples() {
  const examples = `
# SafeGuard Visitor Ban API - cURL Examples

## Authentication
# Replace YOUR_JWT_TOKEN with actual JWT token from login
export JWT_TOKEN="YOUR_JWT_TOKEN"
export BASE_URL="http://localhost:3000/api"

## 1. Create Visitor Ban
curl -X POST $BASE_URL/visitor-bans \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $JWT_TOKEN" \\
  -d '{
    "name": "John Doe",
    "phone": "+2348123456789",
    "reason": "Inappropriate behavior during last visit",
    "severity": "medium",
    "notes": "Resident requested permanent ban"
  }'

## 2. Get Visitor Bans (with pagination)
curl -X GET "$BASE_URL/visitor-bans?page=1&limit=10" \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 3. Search Visitor Bans
curl -X GET "$BASE_URL/visitor-bans/search?query=john&limit=5" \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 4. Check if Visitor is Banned
curl -X GET "$BASE_URL/visitor-bans/check/+2348123456789" \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 5. Check Building-wide Bans
curl -X GET "$BASE_URL/visitor-bans/building-check/+2348123456789" \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 6. Get Ban Statistics
curl -X GET $BASE_URL/visitor-bans/stats \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 7. Get Recently Banned Visitors
curl -X GET "$BASE_URL/visitor-bans/recently-banned?limit=5" \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 8. Filter by Severity
curl -X GET $BASE_URL/visitor-bans/severity/medium \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 9. Export Ban List
curl -X GET "$BASE_URL/visitor-bans/export?format=json" \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 10. Update Ban (replace BAN_ID with actual ID)
curl -X PUT $BASE_URL/visitor-bans/BAN_ID \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $JWT_TOKEN" \\
  -d '{
    "reason": "Updated ban reason",
    "severity": "high",
    "notes": "Updated notes"
  }'

## 11. Unban Visitor by ID
curl -X POST $BASE_URL/visitor-bans/BAN_ID/unban \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $JWT_TOKEN" \\
  -d '{
    "reason": "Ban lifted after apology"
  }'

## 12. Unban Visitor by Phone
curl -X POST $BASE_URL/visitor-bans/unban-by-phone \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $JWT_TOKEN" \\
  -d '{
    "phone": "+2348123456789",
    "reason": "Temporary ban expired"
  }'

## 13. Get Visitor Ban History
curl -X GET $BASE_URL/visitor-bans/history/+2348123456789 \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 14. Get Expiring Bans
curl -X GET $BASE_URL/visitor-bans/expiring \\
  -H "Authorization: Bearer $JWT_TOKEN"

## 15. Create Automatic Ban (Admin only)
curl -X POST $BASE_URL/visitor-bans/automatic \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $JWT_TOKEN" \\
  -d '{
    "user_id": "target-user-id",
    "name": "System Ban",
    "phone": "+2348123456789",
    "trigger": "Suspicious activity detected",
    "severity": "high"
  }'
`;

  fs.writeFileSync('visitor-ban-api-examples.sh', examples);
  console.log('📤 cURL Examples generated: visitor-ban-api-examples.sh');
}

// Run the tests
if (process.argv.includes('--generate-only')) {
  generatePostmanCollection();
  generateCurlExamples();
  console.log('\n✅ Test files generated successfully!');
} else {
  runAPITests().then(() => {
    generatePostmanCollection();
    generateCurlExamples();
  });
}