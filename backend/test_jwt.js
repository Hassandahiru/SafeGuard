#!/usr/bin/env node

/**
 * JWT Authentication Testing Script
 * Tests JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import config from './src/config/environment.js';

console.log('🔐 JWT Authentication Test');
console.log('='.repeat(40));

// Test JWT configuration
console.log('\n1. JWT Configuration:');
console.log(`   Secret: ${config.jwt.secret ? '✅ Set' : '❌ Missing'}`);
console.log(`   Expires In: ${config.jwt.expiresIn}`);
console.log(`   Refresh Expires In: ${config.jwt.refreshExpiresIn}`);

// Test token generation
console.log('\n2. Token Generation Test:');
try {
  const testPayload = {
    userId: 'test-user-id-123',
    email: 'test@example.com',
    role: 'super_admin',
    iat: Math.floor(Date.now() / 1000)
  };
  
  const token = jwt.sign(testPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
  
  console.log(`   ✅ Token generated successfully`);
  console.log(`   Token length: ${token.length} characters`);
  console.log(`   Token preview: ${token.substring(0, 50)}...`);
  
  // Test token verification
  console.log('\n3. Token Verification Test:');
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log(`   ✅ Token verified successfully`);
    console.log(`   Decoded userId: ${decoded.userId}`);
    console.log(`   Decoded email: ${decoded.email}`);
    console.log(`   Decoded role: ${decoded.role}`);
    console.log(`   Token expires: ${new Date(decoded.exp * 1000).toISOString()}`);
    
    // Test expired token scenario
    console.log('\n4. Expired Token Test:');
    const expiredPayload = {
      userId: 'expired-user-id',
      email: 'expired@example.com',
      role: 'resident',
      iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      exp: Math.floor(Date.now() / 1000) - 1800   // 30 minutes ago (expired)
    };
    
    const expiredToken = jwt.sign(expiredPayload, config.jwt.secret);
    
    try {
      jwt.verify(expiredToken, config.jwt.secret);
      console.log(`   ❌ Expired token should have failed verification`);
    } catch (expiredError) {
      if (expiredError.name === 'TokenExpiredError') {
        console.log(`   ✅ Expired token correctly rejected: ${expiredError.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${expiredError.message}`);
      }
    }
    
    // Test invalid secret
    console.log('\n5. Invalid Secret Test:');
    try {
      jwt.verify(token, 'wrong-secret');
      console.log(`   ❌ Invalid secret should have failed verification`);
    } catch (invalidError) {
      if (invalidError.name === 'JsonWebTokenError') {
        console.log(`   ✅ Invalid secret correctly rejected: ${invalidError.message}`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${invalidError.message}`);
      }
    }
    
    // Test malformed token
    console.log('\n6. Malformed Token Test:');
    try {
      jwt.verify('invalid.token.format', config.jwt.secret);
      console.log(`   ❌ Malformed token should have failed verification`);
    } catch (malformedError) {
      console.log(`   ✅ Malformed token correctly rejected: ${malformedError.message}`);
    }
    
  } catch (verifyError) {
    console.log(`   ❌ Token verification failed: ${verifyError.message}`);
  }
  
} catch (genError) {
  console.log(`   ❌ Token generation failed: ${genError.message}`);
}

// Test Bearer token parsing
console.log('\n7. Bearer Token Parsing Test:');
const testAuthHeaders = [
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  'Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  '',
  null,
  undefined
];

testAuthHeaders.forEach((header, index) => {
  console.log(`   Test ${index + 1}: "${header}"`);
  
  if (!header || !header.startsWith('Bearer ')) {
    console.log(`     ❌ Invalid format - should be "Bearer <token>"`);
  } else {
    const token = header.substring(7);
    console.log(`     ✅ Valid format, extracted token: ${token.substring(0, 20)}...`);
  }
});

console.log('\n8. Environment Variable Check:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   JWT_EXPIRES_IN: ${process.env.JWT_EXPIRES_IN || 'using default'}`);

console.log('\n='.repeat(40));
console.log('🎉 JWT Test Complete!');

// Export for testing
export default {
  testTokenGeneration: () => {
    try {
      const payload = { userId: 'test', email: 'test@test.com', role: 'resident' };
      return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    } catch (error) {
      throw new Error(`Token generation failed: ${error.message}`);
    }
  },
  
  testTokenVerification: (token) => {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
};