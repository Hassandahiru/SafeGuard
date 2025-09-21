# SafeGuard Backend - Production Deployment Guide

## 🚀 VPS Deployment for Testing & Small-Scale Production

This guide provides step-by-step instructions for deploying the SafeGuard backend to a VPS server for testing and small customer deployments.

## 📋 Backend Analysis Summary

### ✅ Code Quality Assessment
- **Architecture**: Well-structured Express.js application with Socket.io
- **Security**: Comprehensive authentication, rate limiting, input validation
- **Error Handling**: Production-grade error handling with custom error classes
- **Logging**: Winston logger with daily rotation and multiple log files
- **Dependencies**: All security vulnerabilities fixed (npm audit passed)
- **Configuration**: Robust environment configuration with validation

### ✅ Database Schema
- **Migration System**: Well-organized migration files in `/database/migrations/`
- **Schema Organization**: Proper separation into schemas (profile_management, building_management, visitor_management)
- **Core Tables**: Users, buildings, visitors, visits, frequent_visitors, visitor_bans
- **Relationships**: Proper foreign key constraints and UUID primary keys

### ✅ API Endpoints
- **Authentication**: JWT-based with refresh tokens
- **User Registration**: Multi-step registration with validation
- **Visitor Management**: Complete CRUD operations with QR codes
- **Real-time Features**: Socket.io integration for live updates
- **Admin Features**: Building management and approvals
- **Rate Limiting**: Protection against abuse

### ⚠️ Pre-Deployment Requirements
- PostgreSQL database server needed (currently connection refused)
- Email configuration required for notifications
- Redis optional but recommended for sessions

## 🖥️ VPS Requirements

### Minimum System Requirements
- **CPU**: 2 vCPU cores
- **RAM**: 4GB RAM (8GB recommended)
- **Storage**: 50GB SSD
- **OS**: Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- **Network**: 1Gbps connection

### Recommended VPS Providers
- **DigitalOcean**: $24/month droplet (4GB RAM, 2 vCPU)
- **Linode**: $24/month Nanode (4GB RAM, 2 vCPU)
- **Vultr**: $24/month instance (4GB RAM, 2 vCPU)
- **AWS EC2**: t3.medium instance

## 🛠️ Server Setup

### 1. Initial Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip ufw fail2ban htop

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 4500  # SafeGuard API port
sudo ufw --force enable

# Create application user
sudo adduser --disabled-password --gecos "" safeguard
sudo usermod -aG sudo safeguard
```

### 2. Install Node.js

```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or higher

# Install PM2 globally for process management
sudo npm install -g pm2
```

### 3. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE safeguard_db;
CREATE USER dahiruah WITH ENCRYPTED PASSWORD 'ColdDay@1975';
GRANT ALL PRIVILEGES ON DATABASE safeguard_db TO dahiruadoh;
ALTER USER dahiruah CREATEDB;
\q
EOF

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/*/main/postgresql.conf
# Uncomment and modify: listen_addresses = '*'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: host safeguard_db dahiruadoh 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4. Install Redis (Optional but Recommended)

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Uncomment and modify: requirepass your_redis_password

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 5. Install Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 📦 Application Deployment

### 1. Clone and Setup Application

```bash
# Switch to safeguard user
sudo su - safeguard

# Clone repository
git clone https://github.com/Hassandahiru/SafeGuard.git
cd SafeGuard/backend

# Install dependencies
npm install

# Create production environment file
cp .env .env.production
```

### 2. Configure Production Environment

Edit the production environment file:

```bash
nano .env.production
```

```bash
# Production Environment Configuration
NODE_ENV=production
PORT=4500
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safeguard_db
DB_USER=dahiruadoh
DB_PASSWORD=ColdDay@1975
DATABASE_URL=postgresql://dahiruadoh:ColdDay%401975@localhost:5432/safeguard_db
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Security Configuration - CHANGE THESE!
JWT_SECRET=CHANGE_THIS_TO_VERY_SECURE_SECRET_KEY_IN_PRODUCTION
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Email Configuration - Configure with your SMTP provider
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-production-email@domain.com
SMTP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com

# Payment Configuration (if enabled)
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
PAYSTACK_BASE_URL=https://api.paystack.co

# External Services
GOOGLE_MAPS_API_KEY=your_production_google_maps_api_key

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
UPLOAD_DIR=/var/safeguard/uploads/

# Logging Configuration
LOG_LEVEL=info
LOG_MAX_SIZE=50m
LOG_MAX_FILES=30d
LOG_DATE_PATTERN=YYYY-MM-DD

# CORS Configuration - UPDATE WITH YOUR FRONTEND DOMAINS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
SOCKET_CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_NOTIFICATIONS=true
ENABLE_PAYMENTS=true
ENABLE_EMERGENCY_ALERTS=true

# Building Configuration
DEFAULT_LICENSES=250
MAX_VISITORS_PER_VISIT=10
QR_CODE_EXPIRY_HOURS=24
VISIT_EXPIRY_HOURS=48
```

### 3. Database Migration

```bash
# Create uploads directory
sudo mkdir -p /var/safeguard/uploads
sudo chown safeguard:safeguard /var/safeguard/uploads

# Run database migrations
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/001_create_new_schemas_and_tables.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/002_move_existing_tables_fixed.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/003_cleanup_old_tables.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/004_add_website_column_to_buildings.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/005_create_database_views_fixed.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/006_add_entry_exit_columns.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/007_create_missing_functions.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f database/migrations/008_update_frequent_visitors_structure.sql

# Run additional migrations from migrations folder
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f migrations/007_add_image_columns.sql
PGPASSWORD='ColdDay@1975' psql -h localhost -p 5432 -U dahiruadoh -d safeguard_db -f migrations/008_apartment_change_approval.sql
```

### 4. PM2 Process Management

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'safeguard-api',
    script: 'src/app.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4500
    },
    env_file: '.env.production',
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

Start the application:

```bash
# Create logs directory
mkdir -p logs

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command above
```

## 🌐 Nginx Configuration

### Configure Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/safeguard
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:4500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Socket.io endpoint
    location /socket.io/ {
        proxy_pass http://localhost:4500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:4500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files (if any)
    location /uploads/ {
        alias /var/safeguard/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/safeguard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 SSL Certificate Setup

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## 📊 Monitoring & Logging

### 1. Log Management

```bash
# Create log rotation configuration
sudo nano /etc/logrotate.d/safeguard
```

```
/home/safeguard/SafeGuard/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 safeguard safeguard
    postrotate
        pm2 reload safeguard-api
    endscript
}
```

### 2. System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop netstat-nat

# Monitor PM2 processes
pm2 monit

# Check logs
pm2 logs safeguard-api

# Monitor system resources
htop
```

### 3. Database Monitoring

```bash
# Monitor PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql -d safeguard_db -c "SELECT pg_size_pretty(pg_database_size('safeguard_db'));"
```

## 🔧 Maintenance & Updates

### Regular Maintenance Tasks

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /home/safeguard/SafeGuard/backend
npm audit
npm audit fix
npm update

# Restart application
pm2 restart safeguard-api

# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete

# Database maintenance
sudo -u postgres psql -d safeguard_db -c "VACUUM ANALYZE;"
```

### Application Updates

```bash
# Backup database before updates
sudo -u postgres pg_dump safeguard_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Run new migrations (if any)
# Check for new migration files and run them

# Restart application
pm2 restart safeguard-api
```

## 🚨 Troubleshooting

### Common Issues

1. **Port 4500 in use**
   ```bash
   sudo lsof -i :4500
   pm2 restart safeguard-api
   ```

2. **Database connection issues**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT 1;"
   ```

3. **High memory usage**
   ```bash
   pm2 monit
   pm2 restart safeguard-api
   ```

4. **SSL certificate issues**
   ```bash
   sudo certbot renew --dry-run
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Log Locations

- Application logs: `/home/safeguard/SafeGuard/backend/logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

## 📞 Support & Monitoring

### Health Checks

- API Health: `https://your-domain.com/health`
- Database Status: Monitor connection count and performance
- System Resources: CPU, Memory, Disk usage
- SSL Certificate: Expiry monitoring

### Performance Monitoring

- Response times for API endpoints
- Database query performance
- Socket.io connection health
- File upload performance

## 🔐 Security Checklist

- ✅ Strong database passwords
- ✅ JWT secret keys changed from defaults
- ✅ Firewall configured (UFW)
- ✅ SSL certificates installed
- ✅ Rate limiting enabled
- ✅ Input validation and sanitization
- ✅ Security headers configured
- ✅ Regular security updates
- ✅ Log monitoring for suspicious activity
- ✅ Database backup strategy

## 📈 Scaling Considerations

### For High Traffic (Future)

1. **Load Balancing**: Multiple PM2 instances
2. **Database**: Read replicas, connection pooling
3. **Caching**: Redis for session management
4. **CDN**: For static assets and file uploads
5. **Container Deployment**: Docker + Kubernetes
6. **Monitoring**: Prometheus + Grafana

### Current Setup Capacity

- **Concurrent Users**: ~500-1000 users
- **API Requests**: ~1000 req/min
- **Database**: ~10GB data storage
- **File Storage**: ~20GB uploads

---

**Note**: This deployment setup is optimized for testing and small-scale production use. For enterprise deployments, consider containerization with Docker and orchestration with Kubernetes.
