import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import SocketHandler from './sockets/socketHandler.js';
import NotificationService from './services/notification.service.js';

import config from './config/environment.js';
import database from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';

// Import routes
import authRoutes from './routes/authRoutes.routes.js';
import userRegistrationRoutes from './routes/userRegistration.routes.js';
import visitorRoutes from './routes/visitor.routes.js';
import frequentVisitorRoutes from './routes/frequentVisitor.routes.js';
import visitorBanRoutes from './routes/visitorBan.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminApprovalRoutes from './routes/adminApproval.routes.js';

class SafeGuardApp {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: config.socketio.cors,
      transports: config.socketio.transports
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupSocketIO();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Allow for development
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors(config.cors));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP'
        }
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });
  }

  setupRoutes() {
    // API routes will be added here
    this.app.get('/api', (req, res) => {
      res.json({
        message: 'SafeGuard API',
        version: 'v1',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          registration: '/api/registration',
          visits: '/api/visits',
          visitors: '/api/visitors',
          admin: '/api/admin',
          adminApproval: '/api/admin-approval'
        }
      });
    });

    // Register API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/registration', userRegistrationRoutes);
    this.app.use('/api/visitors', visitorRoutes);
    this.app.use('/api/frequent-visitors', frequentVisitorRoutes);
    this.app.use('/api/visitor-bans', visitorBanRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/admin-approval', adminApprovalRoutes);
  }

  setupSocketIO() {
    // Initialize Socket Handler
    this.socketHandler = new SocketHandler(this.io);
    this.socketHandler.initialize();

    // Connect notification service to socket handler for real-time delivery
    NotificationService.setSocketHandler(this.socketHandler);

    logger.info('Socket.io initialized with real-time notifications');
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await database.connect();
      logger.info('Database connected successfully');

      // Start server
      const PORT = config.PORT || 3000;
      const HOST = process.env.HOST || 'localhost';
      
      this.server.listen(PORT, HOST, () => {
        this.logServerStartup(PORT, HOST);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  logServerStartup(PORT, HOST) {
    const startupTime = new Date().toISOString();
    const version = process.env.npm_package_version || '1.0.0';
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    
    // Console logging with enhanced server information
    console.log('\n' + '🚀'.repeat(40));
    console.log('🚀 SAFEGUARD API SERVER STARTED SUCCESSFULLY! 🚀');
    console.log('🚀'.repeat(40));
    
    console.log('\n📊 SERVER INFORMATION:');
    console.log('━'.repeat(50));
    console.log(`🌐 Server URL:      http://${HOST}:${PORT}`);
    console.log(`🏠 Host:            ${HOST}`);
    console.log(`🔌 Port:            ${PORT}`);
    console.log(`🏷️  Version:         v${version}`);
    console.log(`⚙️  Environment:     ${config.NODE_ENV}`);
    console.log(`📅 Started:         ${startupTime}`);
    console.log(`⏱️  Startup Time:    ${uptime.toFixed(2)} seconds`);
    
    console.log('\n🖥️  SYSTEM INFORMATION:');
    console.log('━'.repeat(50));
    console.log(`🟢 Node.js:         ${nodeVersion}`);
    console.log(`💻 Platform:        ${platform} (${arch})`);
    console.log(`🧠 Memory Usage:    ${(memory.rss / 1024 / 1024).toFixed(2)} MB RSS`);
    console.log(`📦 Heap Used:       ${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📈 Heap Total:      ${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n🔗 API ENDPOINTS:');
    console.log('━'.repeat(50));
    console.log(`🏥 Health Check:    http://${HOST}:${PORT}/health`);
    console.log(`📋 API Info:        http://${HOST}:${PORT}/api`);
    
    console.log('\n🔐 AUTHENTICATION ENDPOINTS:');
    console.log(`   🔑 Auth (Basic & Enhanced): http://${HOST}:${PORT}/api/auth`);
    
    console.log('\n👥 USER REGISTRATION (SIGNUP) ENDPOINTS:');
    console.log(`   📝 User Signup:     http://${HOST}:${PORT}/api/registration`);
    console.log(`   ✅ Validate:        http://${HOST}:${PORT}/api/registration/validate`);
    console.log(`   ✍️  Complete:        http://${HOST}:${PORT}/api/registration/complete`);
    console.log(`   🏠 Self Register:   http://${HOST}:${PORT}/api/registration/self-register`);
    console.log(`   📊 Bulk Import:     http://${HOST}:${PORT}/api/registration/bulk`);
    console.log(`   📈 Statistics:      http://${HOST}:${PORT}/api/registration/stats/:building_id`);
    
    console.log('\n🏢 BUILDING & ADMIN MANAGEMENT:');
    console.log(`   🏗️  Buildings:       http://${HOST}:${PORT}/api/admin/buildings`);
    console.log(`   🚀 Initial Setup:   http://${HOST}:${PORT}/api/admin/initial-setup`);
    console.log(`   👑 Admin Panel:     http://${HOST}:${PORT}/api/admin`);
    console.log(`   📋 Building Admin:  http://${HOST}:${PORT}/api/registration/building-admin`);
    console.log(`   🛡️  Security Staff:  http://${HOST}:${PORT}/api/registration/security`);
    
    console.log('\n👤 VISITOR MANAGEMENT:');
    console.log(`   🎫 Visitors:        http://${HOST}:${PORT}/api/visitors`);
    console.log(`   ⭐ Frequent:        http://${HOST}:${PORT}/api/frequent-visitors`);
    console.log(`   🚫 Bans:            http://${HOST}:${PORT}/api/visitor-bans`);
    
    console.log('\n🔌 SOCKET.IO:');
    console.log('━'.repeat(50));
    console.log(`📡 Socket Server:   ws://${HOST}:${PORT}`);
    console.log(`🔄 Transports:      ${config.socketio.transports.join(', ')}`);
    console.log(`🌐 CORS Origins:    ${config.socketio.cors.origin}`);
    
    console.log('\n🗄️  DATABASE:');
    console.log('━'.repeat(50));
    console.log(`✅ Status:          Connected`);
    console.log(`🏠 Host:            ${config.database.host}:${config.database.port}`);
    console.log(`📊 Database:        ${config.database.name}`);
    console.log(`👤 User:            ${config.database.user}`);
    console.log(`🏊 Pool Max:        ${config.database.pool.max} connections`);
    
    console.log('\n🛡️  SECURITY:');
    console.log('━'.repeat(50));
    console.log(`🔒 JWT Enabled:     ✅ Yes`);
    console.log(`⏰ Token Expiry:    ${config.jwt.expiresIn}`);
    console.log(`🔄 Refresh Expiry:  ${config.jwt.refreshExpiresIn}`);
    console.log(`🧂 Salt Rounds:     ${config.security.saltRounds}`);
    console.log(`🚦 Rate Limiting:   ${config.security.rateLimitMax} req/${config.security.rateLimitWindow/60000}min`);
    
    console.log('\n🏢 FEATURES:');
    console.log('━'.repeat(50));
    console.log(`📊 Analytics:       ${config.features.enableAnalytics ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`🔔 Notifications:   ${config.features.enableNotifications ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`💳 Payments:        ${config.features.enablePayments ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`🚨 Emergency:       ${config.features.enableEmergencyAlerts ? '✅ Enabled' : '❌ Disabled'}`);
    
    console.log('\n🔧 MIDDLEWARE:');
    console.log('━'.repeat(50));
    console.log(`🛡️  Helmet:          ✅ Security headers`);
    console.log(`🌐 CORS:            ✅ Cross-origin requests`);
    console.log(`🗜️  Compression:     ✅ Response compression`);
    console.log(`📝 Request Logger:  ✅ Request/response logging`);
    console.log(`🚦 Rate Limiter:    ✅ API rate limiting`);
    
    if (config.NODE_ENV === 'development') {
      console.log('\n🔧 DEVELOPMENT TOOLS:');
      console.log('━'.repeat(50));
      console.log(`📋 Postman Guide:   POSTMAN_TESTING_GUIDE.md`);
      console.log(`📁 Collection:      SafeGuard_Enhanced_Auth.postman_collection.json`);
      console.log(`🌍 Environment:     SafeGuard_Environment.postman_environment.json`);
      console.log(`📊 Test Script:     test_enhanced_auth.js`);
    }
    
    console.log('\n' + '✨'.repeat(40));
    console.log('✨ READY TO HANDLE REQUESTS! ✨');
    console.log('✨'.repeat(40) + '\n');
    
    // Log to structured logger as well
    logger.info('SafeGuard API Server started successfully', {
      server: {
        url: `http://${HOST}:${PORT}`,
        host: HOST,
        port: PORT,
        environment: config.NODE_ENV,
        version: version,
        startTime: startupTime
      },
      system: {
        nodeVersion: nodeVersion,
        platform: platform,
        architecture: arch,
        memory: {
          rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`
        }
      },
      database: {
        status: 'connected',
        host: config.database.host,
        port: config.database.port,
        name: config.database.name,
        user: config.database.user
      },
      features: config.features,
      endpoints: {
        health: `http://${HOST}:${PORT}/health`,
        api: `http://${HOST}:${PORT}/api`,
        auth: `http://${HOST}:${PORT}/api/auth`,
        userSignup: {
          base: `http://${HOST}:${PORT}/api/registration`,
          validate: `http://${HOST}:${PORT}/api/registration/validate`,
          complete: `http://${HOST}:${PORT}/api/registration/complete`,
          selfRegister: `http://${HOST}:${PORT}/api/registration/self-register`,
          bulk: `http://${HOST}:${PORT}/api/registration/bulk`,
          buildingAdmin: `http://${HOST}:${PORT}/api/registration/building-admin`,
          security: `http://${HOST}:${PORT}/api/registration/security`
        },
        admin: {
          panel: `http://${HOST}:${PORT}/api/admin`,
          buildings: `http://${HOST}:${PORT}/api/admin/buildings`,
          initialSetup: `http://${HOST}:${PORT}/api/admin/initial-setup`
        },
        visitors: {
          base: `http://${HOST}:${PORT}/api/visitors`,
          frequent: `http://${HOST}:${PORT}/api/frequent-visitors`,
          bans: `http://${HOST}:${PORT}/api/visitor-bans`
        }
      }
    });
  }

  async gracefulShutdown() {
    logger.info('Received shutdown signal, closing server gracefully...');
    
    this.server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connection
      database.close().then(() => {
        logger.info('Database connection closed');
        process.exit(0);
      }).catch((error) => {
        logger.error('Error closing database connection:', error);
        process.exit(1);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
}

// Create and start the application
const app = new SafeGuardApp();

// Start the server only if this file is run directly

if (import.meta.url === `file://${process.argv[1]}`) {
  app.start();
}

export default app;
