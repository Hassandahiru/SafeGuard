#!/usr/bin/env node

/**
 * SafeGuard Test Runner
 * Runs all tests in the correct order
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

const execAsync = promisify(exec);

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    test: '🧪'
  }[type];
  
  console.log(`[${timestamp}] ${emoji} ${message}`);
}

async function runTest(testPath, description) {
  try {
    log(`Running: ${description}`, 'test');
    const { stdout, stderr } = await execAsync(`node "${testPath}"`, {
      cwd: path.resolve(__dirname, '..')
    });
    
    if (stderr) {
      log(`Warning in ${description}: ${stderr}`, 'warning');
    }
    
    log(`✅ ${description} completed successfully`, 'success');
    return { success: true, output: stdout };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  log('🚀 Starting SafeGuard Test Suite', 'info');
  log('=' .repeat(60), 'info');
  
  const testResults = [];
  
  // Test sequence
  const tests = [
    {
      path: path.join(__dirname, 'config-test.js'),
      description: 'Configuration Test',
      required: true
    },
    {
      path: path.join(__dirname, 'setup-test-environment.js'),
      description: 'Test Environment Setup',
      required: true
    },
    {
      path: path.join(__dirname, 'auth-complete-test.js'),
      description: 'Authentication Flow Test',
      required: true
    },
    {
      path: path.join(__dirname, 'api-test-suite.js'),
      description: 'API Test Suite',
      required: true
    }
  ];
  
  log('📋 Test Sequence:', 'info');
  tests.forEach((test, index) => {
    log(`   ${index + 1}. ${test.description}`, 'info');
  });
  log('', 'info');
  
  // Run tests sequentially
  for (const test of tests) {
    const result = await runTest(test.path, test.description);
    testResults.push({
      ...test,
      ...result
    });
    
    // If required test fails, stop execution
    if (!result.success && test.required) {
      log(`❌ Required test "${test.description}" failed. Stopping test suite.`, 'error');
      break;
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  log('=' .repeat(60), 'info');
  log('📊 TEST SUITE SUMMARY', 'info');
  log('=' .repeat(60), 'info');
  
  const passed = testResults.filter(t => t.success).length;
  const failed = testResults.filter(t => !t.success).length;
  
  log(`✅ Passed: ${passed}`, 'success');
  log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  log(`📊 Total: ${testResults.length}`, 'info');
  
  if (failed > 0) {
    log('\\n❌ FAILED TESTS:', 'error');
    testResults
      .filter(t => !t.success)
      .forEach(test => {
        log(`   • ${test.description}: ${test.error}`, 'error');
      });
  }
  
  log('', 'info');
  log('🎯 Manual Tests Available:', 'info');
  log('   Open tests/socket-test.html in your browser', 'info');
  log('   Run individual tests: npm run test:config', 'info');
  
  if (failed === 0) {
    log('🎉 ALL AUTOMATED TESTS PASSED!', 'success');
    log('🔍 Don\'t forget to run the manual Socket.io test in your browser', 'info');
  } else {
    log('⚠️  Some tests failed. Please check the errors above.', 'warning');
  }
  
  return failed === 0;
}

async function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'info');
  
  // Check if server is running
  try {
    const PORT = process.env.PORT || 4500;
    const response = await fetch(`http://localhost:${PORT}/health`);
    
    if (response.ok) {
      log('✅ Server is running', 'success');
    } else {
      throw new Error('Server health check failed');
    }
  } catch (error) {
    log('❌ Server is not running or not responding', 'error');
    log('   Please start the server first: npm start', 'error');
    return false;
  }
  
  // Check environment variables
  const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`❌ Missing environment variables: ${missingVars.join(', ')}`, 'error');
    return false;
  }
  
  log('✅ Prerequisites check passed', 'success');
  return true;
}

async function main() {
  try {
    log('🧪 SafeGuard Test Suite', 'info');
    log('=' .repeat(60), 'info');
    
    // Check prerequisites
    const prereqsPassed = await checkPrerequisites();
    if (!prereqsPassed) {
      log('❌ Prerequisites check failed. Please fix the issues above.', 'error');
      process.exit(1);
    }
    
    // Run all tests
    const allTestsPassed = await runAllTests();
    
    process.exit(allTestsPassed ? 0 : 1);
  } catch (error) {
    log(`❌ Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n⚠️  Test suite interrupted by user.');
  process.exit(0);
});

main();