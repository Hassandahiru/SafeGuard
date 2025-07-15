import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import config from './config/environment.js';
import database from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import requestLogger from './middleware/requestLogger.js';
import SocketHandler from './sockets/socketHandler.js';
import NotificationService from './services/notification.service.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import visitorRoutes from './routes/visitor.routes.js';
import frequentVisitorRoutes from './routes/frequentVisitor.routes.js';
import visitorBanRoutes from './routes/visitorBan.routes.js';

class SafeGuardApp {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: config.socketio.cors,
      transports: config.socketio.transports
    });
    
    // Initialize socket handler
    this.socketHandler = new SocketHandler(this.io);
    
    // Connect notification service to socket handler
    NotificationService.setSocketHandler(this.socketHandler);
    
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
          visits: '/api/visits',
          visitors: '/api/visitors',
          'frequent-visitors': '/api/frequent-visitors',
          'visitor-bans': '/api/visitor-bans',
          admin: '/api/admin'
        }
      });
    });

    // Register routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/visitors', visitorRoutes);
    this.app.use('/api/frequent-visitors', frequentVisitorRoutes);
    this.app.use('/api/visitor-bans', visitorBanRoutes);
    
    // TODO: Add remaining routes as they are implemented
    // this.app.use('/api/admin', adminRoutes);
    // this.app.use('/api/analytics', analyticsRoutes);
  }

  setupSocketIO() {
    // Initialize socket handler with authentication and event handling
    this.socketHandler.initialize();
    
    logger.info('Socket.IO setup completed with authentication and event handlers');
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
      const PORT = config.PORT;
      this.server.listen(PORT, () => {
        logger.info(`SafeGuard API Server started`, {
          port: PORT,
          environment: config.NODE_ENV,
          version: process.env.npm_package_version || '1.0.0',
          timestamp: new Date().toISOString()
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
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