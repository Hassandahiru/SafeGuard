import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

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
