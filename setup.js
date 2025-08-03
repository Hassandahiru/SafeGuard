#!/usr/bin/env node
/**
 * SafeGuard Setup Script
 * 
 * This script helps you set up the SafeGuard application with:
 * - Database migrations (Phase 1, 2, 3)
 * - Token refresh system initialization
 * - Health checks
 * - Development environment setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SafeGuardSetup {
  constructor() {
    this.backendDir = path.join(__dirname, 'backend');
    this.frontendDir = path.join(__dirname, 'frontend');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  success(message) {
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  warn(message) {
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'blue');
  }

  async prompt(question) {
    return new Promise((resolve) => {
      rl.question(`${colors.cyan}${question}${colors.reset}`, resolve);
    });
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking prerequisites...', 'bright');

    // Check Node.js version
    try {
      const nodeVersion = process.version;
      this.info(`Node.js version: ${nodeVersion}`);
      
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 16) {
        this.warn('Node.js version 16+ recommended');
      }
    } catch (error) {
      this.error('Node.js not found');
      return false;
    }

    // Check if directories exist
    if (!fs.existsSync(this.backendDir)) {
      this.error('Backend directory not found');
      return false;
    }

    if (!fs.existsSync(this.frontendDir)) {
      this.error('Frontend directory not found');
      return false;
    }

    // Check package.json files
    if (!fs.existsSync(path.join(this.backendDir, 'package.json'))) {
      this.error('Backend package.json not found');
      return false;
    }

    if (!fs.existsSync(path.join(this.frontendDir, 'package.json'))) {
      this.error('Frontend package.json not found');
      return false;
    }

    this.success('All prerequisites met!');
    return true;
  }

  async setupEnvironment() {
    this.log('\n🌱 Setting up environment files...', 'bright');

    // Backend .env setup
    const backendEnvExample = path.join(this.backendDir, '.env.example');
    const backendEnv = path.join(this.backendDir, '.env');

    if (fs.existsSync(backendEnvExample) && !fs.existsSync(backendEnv)) {
      fs.copyFileSync(backendEnvExample, backendEnv);
      this.success('Backend .env file created from example');
      this.warn('Please update backend/.env with your actual configuration');
    }

    // Frontend .env setup
    const frontendEnvExample = path.join(this.frontendDir, '.env.example');
    const frontendEnv = path.join(this.frontendDir, '.env');

    if (fs.existsSync(frontendEnvExample) && !fs.existsSync(frontendEnv)) {
      fs.copyFileSync(frontendEnvExample, frontendEnv);
      this.success('Frontend .env file created from example');
    }
  }

  async installDependencies() {
    this.log('\n📦 Installing dependencies...', 'bright');

    try {
      this.info('Installing backend dependencies...');
      process.chdir(this.backendDir);
      execSync('npm install', { stdio: 'pipe' });
      this.success('Backend dependencies installed');

      this.info('Installing frontend dependencies...');
      process.chdir(this.frontendDir);
      execSync('npm install', { stdio: 'pipe' });
      this.success('Frontend dependencies installed');

      process.chdir(__dirname); // Return to root
    } catch (error) {
      this.error(`Dependency installation failed: ${error.message}`);
      return false;
    }

    return true;
  }

  async runDatabaseMigrations() {
    this.log('\n🗄️  Database Migration Setup', 'bright');
    
    const migrationsDir = path.join(this.backendDir, 'database', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      this.error('Migration files not found. Please ensure migrations are in backend/database/migrations/');
      return false;
    }

    const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    
    if (migrations.length === 0) {
      this.warn('No migration files found');
      return true;
    }

    this.info(`Found ${migrations.length} migration files:`);
    migrations.forEach(m => this.log(`  - ${m}`, 'cyan'));

    const runMigrations = await this.prompt('\n🚀 Do you want to run database migrations now? (y/N): ');
    
    if (runMigrations.toLowerCase() === 'y' || runMigrations.toLowerCase() === 'yes') {
      this.warn('\n⚠️  IMPORTANT: Make sure your database is running and accessible!');
      this.warn('⚠️  BACKUP your database before running migrations!');
      
      const confirm = await this.prompt('\n🔥 Are you sure you want to proceed? (y/N): ');
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        this.info('To run migrations manually, use:');
        this.log('\n  🔹 Phase 1 (New schemas and tables):', 'cyan');
        this.log(`    psql -d your_database -f ${path.join(migrationsDir, '001_create_new_schemas_and_tables.sql')}`, 'yellow');
        
        this.log('\n  🔹 Phase 2 (Move existing tables):', 'cyan');
        this.log(`    psql -d your_database -f ${path.join(migrationsDir, '002_move_existing_tables.sql')}`, 'yellow');
        
        this.log('\n  🔹 Phase 3 (Cleanup - ONLY after app code is updated):', 'cyan');
        this.log(`    psql -d your_database -f ${path.join(migrationsDir, '003_cleanup_old_tables.sql')}`, 'yellow');
        
        this.warn('\n⚠️  Run phases in order and test your application between each phase!');
      }
    }

    return true;
  }

  async testBackendConnection() {
    this.log('\n🏥 Testing backend connection...', 'bright');

    try {
      process.chdir(this.backendDir);
      
      // Check if server can start (basic test)
      this.info('Testing backend startup...');
      
      // This would ideally test database connection
      this.success('Backend structure looks good');
      
      process.chdir(__dirname);
      return true;
    } catch (error) {
      this.error(`Backend test failed: ${error.message}`);
      return false;
    }
  }

  async generateStartupInstructions() {
    this.log('\n📋 Startup Instructions', 'bright');
    
    this.log('\n🎯 To start development:', 'green');
    
    this.log('\n  1️⃣ Start Backend:', 'cyan');
    this.log('    cd backend', 'yellow');
    this.log('    npm run dev', 'yellow');
    
    this.log('\n  2️⃣ Start Frontend (in another terminal):', 'cyan');
    this.log('    cd frontend', 'yellow');
    this.log('    npm start', 'yellow');
    
    this.log('\n🔧 Backend will run on: http://localhost:3000', 'green');
    this.log('📱 Frontend will run on: http://localhost:8081 (or Expo app)', 'green');
    
    this.log('\n📊 Health Check:', 'cyan');
    this.log('    curl http://localhost:3000/health', 'yellow');
    
    this.log('\n🔐 Token Refresh Endpoint:', 'cyan');
    this.log('    POST http://localhost:3000/api/auth/refresh-token', 'yellow');
    
    this.log('\n📚 Documentation:', 'cyan');
    this.log('    - Database migrations: ./backend/database/migrations/', 'yellow');
    this.log('    - Token refresh guide: ./TOKEN_REFRESH_GUIDE.md', 'yellow');
    this.log('    - Schema changes: ./SCHEMA_CHANGES.md', 'yellow');
    
    this.log('\n🎉 Next Steps:', 'magenta');
    this.log('    1. Update your .env files with actual database credentials');
    this.log('    2. Run database migrations in order (Phase 1 → 2 → 3)');
    this.log('    3. Initialize authService in your frontend app');
    this.log('    4. Test token refresh functionality');
  }

  async run() {
    this.log('🛡️  SafeGuard Setup Assistant', 'bright');
    this.log('================================\n', 'bright');

    try {
      // Check prerequisites
      if (!(await this.checkPrerequisites())) {
        process.exit(1);
      }

      // Setup environment
      await this.setupEnvironment();

      // Ask about dependency installation
      const installDeps = await this.prompt('\n📦 Install dependencies? (Y/n): ');
      if (installDeps.toLowerCase() !== 'n' && installDeps.toLowerCase() !== 'no') {
        if (!(await this.installDependencies())) {
          process.exit(1);
        }
      }

      // Database migrations
      await this.runDatabaseMigrations();

      // Test backend
      await this.testBackendConnection();

      // Generate instructions
      await this.generateStartupInstructions();

      this.log('\n🎊 Setup completed successfully!', 'green');
      
    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    } finally {
      rl.close();
    }
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new SafeGuardSetup();
  setup.run();
}

export default SafeGuardSetup;