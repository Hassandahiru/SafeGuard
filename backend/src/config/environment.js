import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
const dotenvResult = dotenvConfig();

// Enhanced dotenv logging function
const logEnvironmentVariables = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (!isDevelopment) {
    console.log('🔧 Environment: Production (detailed env logging disabled for security)');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔧 SAFEGUARD BACKEND - ENVIRONMENT CONFIGURATION');
  console.log('='.repeat(80));
  
  // Check if .env file was loaded
  if (dotenvResult.error) {
    console.log('❌ .env file loading failed:', dotenvResult.error.message);
    
    // Check if .env file exists
    const envPath = path.resolve(process.cwd(), '.env');
    const envExists = fs.existsSync(envPath);
    console.log(`📁 .env file exists at ${envPath}: ${envExists ? '✅ Yes' : '❌ No'}`);
    
    if (!envExists) {
      console.log('💡 Create a .env file in the project root with your configuration variables');
    }
  } else {
    console.log('✅ .env file loaded successfully');
    if (dotenvResult.parsed) {
      console.log(`📊 Loaded ${Object.keys(dotenvResult.parsed).length} variables from .env file`);
    }
  }

  console.log('\n📋 ENVIRONMENT VARIABLES STATUS:');
  console.log('-'.repeat(50));

  // Define environment variable categories for organized logging
  const envCategories = {
    '🌍 Core Application': {
      'NODE_ENV': process.env.NODE_ENV,
      'PORT': process.env.PORT,
      'API_VERSION': process.env.API_VERSION
    },
    '🗄️ Database Configuration': {
      'DB_HOST': process.env.DB_HOST,
      'DB_PORT': process.env.DB_PORT,
      'DB_NAME': process.env.DB_NAME,
      'DB_USER': process.env.DB_USER,
      'DB_PASSWORD': process.env.DB_PASSWORD ? '***HIDDEN***' : undefined,
      'DB_POOL_MAX': process.env.DB_POOL_MAX,
      'DB_IDLE_TIMEOUT': process.env.DB_IDLE_TIMEOUT,
      'DB_CONNECTION_TIMEOUT': process.env.DB_CONNECTION_TIMEOUT
    },
    '🔐 Security & Authentication': {
      'JWT_SECRET': process.env.JWT_SECRET ? '***HIDDEN***' : undefined,
      'JWT_EXPIRES_IN': process.env.JWT_EXPIRES_IN,
      'JWT_REFRESH_EXPIRES_IN': process.env.JWT_REFRESH_EXPIRES_IN,
      'BCRYPT_SALT_ROUNDS': process.env.BCRYPT_SALT_ROUNDS,
      'RATE_LIMIT_WINDOW': process.env.RATE_LIMIT_WINDOW,
      'RATE_LIMIT_MAX': process.env.RATE_LIMIT_MAX
    },
    '📧 Email Configuration': {
      'SMTP_HOST': process.env.SMTP_HOST,
      'SMTP_PORT': process.env.SMTP_PORT,
      'SMTP_SECURE': process.env.SMTP_SECURE,
      'SMTP_USER': process.env.SMTP_USER,
      'SMTP_PASSWORD': process.env.SMTP_PASSWORD ? '***HIDDEN***' : undefined,
      'EMAIL_FROM': process.env.EMAIL_FROM
    },
    '💳 Payment Integration': {
      'PAYSTACK_SECRET_KEY': process.env.PAYSTACK_SECRET_KEY ? '***HIDDEN***' : undefined,
      'PAYSTACK_PUBLIC_KEY': process.env.PAYSTACK_PUBLIC_KEY ? '***HIDDEN***' : undefined,
      'PAYSTACK_BASE_URL': process.env.PAYSTACK_BASE_URL
    },
    '🗺️ External Services': {
      'GOOGLE_MAPS_API_KEY': process.env.GOOGLE_MAPS_API_KEY ? '***HIDDEN***' : undefined,
      'REDIS_HOST': process.env.REDIS_HOST,
      'REDIS_PORT': process.env.REDIS_PORT,
      'REDIS_PASSWORD': process.env.REDIS_PASSWORD ? '***HIDDEN***' : undefined
    },
    '📁 File & Upload Settings': {
      'MAX_FILE_SIZE': process.env.MAX_FILE_SIZE,
      'ALLOWED_FILE_TYPES': process.env.ALLOWED_FILE_TYPES,
      'UPLOAD_DIR': process.env.UPLOAD_DIR
    },
    '📊 Logging Configuration': {
      'LOG_LEVEL': process.env.LOG_LEVEL,
      'LOG_MAX_SIZE': process.env.LOG_MAX_SIZE,
      'LOG_MAX_FILES': process.env.LOG_MAX_FILES,
      'LOG_DATE_PATTERN': process.env.LOG_DATE_PATTERN
    },
    '🌐 CORS & Socket Configuration': {
      'CORS_ORIGIN': process.env.CORS_ORIGIN,
      'SOCKET_CORS_ORIGIN': process.env.SOCKET_CORS_ORIGIN
    },
    '🏢 Application Features': {
      'ENABLE_ANALYTICS': process.env.ENABLE_ANALYTICS,
      'ENABLE_NOTIFICATIONS': process.env.ENABLE_NOTIFICATIONS,
      'ENABLE_PAYMENTS': process.env.ENABLE_PAYMENTS,
      'ENABLE_EMERGENCY_ALERTS': process.env.ENABLE_EMERGENCY_ALERTS
    }
  };

  // Log each category
  Object.entries(envCategories).forEach(([category, variables]) => {
    console.log(`\n${category}:`);
    Object.entries(variables).forEach(([key, value]) => {
      const status = value !== undefined ? '✅' : '❌';
      const displayValue = value !== undefined ? value : 'NOT SET';
      const isDefault = !process.env[key] ? ' (using default)' : '';
      console.log(`  ${status} ${key}: ${displayValue}${isDefault}`);
    });
  });

  // Critical configuration warnings
  console.log('\n⚠️  CONFIGURATION WARNINGS:');
  console.log('-'.repeat(30));
  
  const warnings = [];
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    warnings.push('JWT_SECRET is using default value - CHANGE IN PRODUCTION!');
  }
  
  if (!process.env.DB_PASSWORD) {
    warnings.push('DB_PASSWORD not set - using default');
  }
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    warnings.push('Email configuration incomplete - notifications may not work');
  }
  
  if (!process.env.PAYSTACK_SECRET_KEY && process.env.ENABLE_PAYMENTS === 'true') {
    warnings.push('Payment features enabled but Paystack keys not configured');
  }
  
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    warnings.push('Google Maps API key not set - location features may not work');
  }

  if (warnings.length === 0) {
    console.log('✅ No configuration warnings');
  } else {
    warnings.forEach(warning => console.log(`⚠️  ${warning}`));
  }

  // Environment-specific recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('-'.repeat(20));
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development Environment Detected:');
    console.log('  • Create .env file with your local configuration');
    console.log('  • Use strong JWT_SECRET even in development');
    console.log('  • Set up local database credentials');
    console.log('  • Configure email settings for testing');
  }

  console.log('\n📚 For complete environment setup guide, see:');
  console.log('  • README.md');
  console.log('  • .env.example file');
  console.log('  • POSTMAN_TESTING_GUIDE.md');
  
  console.log('\n' + '='.repeat(80) + '\n');
};

// Log environment variables immediately
logEnvironmentVariables();

const config = {
  // Server Configuration
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_VERSION: process.env.API_VERSION || 'v1',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'safeguard',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    },
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  // Security Configuration
  security: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000 // 1 hour
  },
  
  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@safeguard.com'
  },
  
  // Payment Configuration (Paystack)
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'
  },
  
  // Google Maps Configuration
  maps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : ['image/jpeg', 'image/png', 'image/gif'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads/'
  },
  
  // QR Code Configuration
  qrCode: {
    size: parseInt(process.env.QR_CODE_SIZE) || 200,
    margin: parseInt(process.env.QR_CODE_MARGIN) || 2,
    color: {
      dark: process.env.QR_CODE_DARK_COLOR || '#000000',
      light: process.env.QR_CODE_LIGHT_COLOR || '#FFFFFF'
    }
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
  },
  
  // Socket.IO Configuration
  socketio: {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // Application Features
  features: {
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableNotifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
    enablePayments: process.env.ENABLE_PAYMENTS === 'true',
    enableEmergencyAlerts: process.env.ENABLE_EMERGENCY_ALERTS !== 'false'
  },
  
  // Building Defaults
  building: {
    defaultLicenses: parseInt(process.env.DEFAULT_LICENSES) || 250,
    maxVisitorsPerVisit: parseInt(process.env.MAX_VISITORS_PER_VISIT) || 10,
    qrCodeExpiryHours: parseInt(process.env.QR_CODE_EXPIRY_HOURS) || 24,
    visitExpiryHours: parseInt(process.env.VISIT_EXPIRY_HOURS) || 48
  }
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET'];
if (config.NODE_ENV === 'production') {
  requiredEnvVars.push('DB_PASSWORD', 'SMTP_USER', 'SMTP_PASSWORD');
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export default config;
