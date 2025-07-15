# SafeGuard Test Suite

All tests consolidated into a single directory for easy management.

## Test Files

### 1. Configuration & Setup
- `config-test.js` - Test environment configuration
- `setup-test-environment.js` - Database setup and test data creation

### 2. Authentication Tests
- `auth-complete-test.js` - Complete authentication flow (registration, login, protected endpoints)

### 3. API Tests
- `api-test-suite.js` - Comprehensive API endpoint testing
- `socket-test.html` - Interactive Socket.io testing interface

### 4. Utilities
- `test-helpers.js` - Common test utilities and helpers

### 5. Test Runner
- `run-all-tests.js` - Main test runner for all automated tests

## Quick Start

```bash
# Run all tests
npm test

# Individual tests
npm run test:config     # Configuration test
npm run test:auth       # Authentication test
npm run test:api        # API test suite
npm run test:setup      # Setup test environment

# Interactive test
open tests/socket-test.html
```

## Test Environment Requirements

1. Server running on port 4500 (or configured port)
2. PostgreSQL database configured
3. Environment variables set in `.env`
4. Test building created in database

## Test Data

All tests use consistent test data from environment variables:
- Email: `test@safeguard.com`
- Phone: `+2348123456789`
- Building ID: `b1234567-1234-1234-1234-123456789012`
- Apartment: `A101`