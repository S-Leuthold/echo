# Deployment Guide

## Overview

This guide covers deployment options for the Echo application, including local deployment, cloud deployment, and production best practices.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Deployment](#local-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements
- Python 3.11+
- Node.js 18+
- 2GB RAM minimum (4GB recommended)
- 10GB disk space
- SSL certificate (for production)

### Required Services
- OpenAI API access
- Anthropic Claude API access
- Microsoft Azure App Registration (for email features)
- Domain name (for production)

## Environment Configuration

### Environment Variables

Create a `.env` file with all required variables:

```bash
# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Microsoft Graph API (Email Integration)
ECHO_GRAPH_CLIENT_ID=your-client-id
ECHO_GRAPH_CLIENT_SECRET=your-client-secret
ECHO_GRAPH_REDIRECT_URI=http://localhost:8000/oauth/callback

# Application Settings
ECHO_ENV=production
ECHO_DEBUG=false
ECHO_LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite:///data/echo.db

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=https://your-domain.com

# Security
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=https://your-domain.com

# Optional: Monitoring
SENTRY_DSN=https://...
DATADOG_API_KEY=...
```

### Configuration Validation

Run configuration check before deployment:

```bash
python -c "from echo.config import validate_config; validate_config()"
```

## Local Deployment

### Quick Start

1. **Clone and setup:**
```bash
git clone https://github.com/your-repo/echo.git
cd echo
```

2. **Install backend dependencies:**
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
npm run build
cd ..
```

4. **Initialize database:**
```bash
python -m echo.database_setup
```

5. **Start services:**
```bash
# Terminal 1: Backend
python api_server.py

# Terminal 2: Frontend (development)
cd frontend && npm run dev

# Or serve built frontend
cd frontend && npx serve -s build -l 3000
```

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'echo-api',
      script: 'python',
      args: 'api_server.py',
      cwd: '/path/to/echo',
      env: {
        ECHO_ENV: 'production'
      }
    },
    {
      name: 'echo-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/echo/frontend'
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs
```

## Docker Deployment

### Docker Configuration

Create `Dockerfile.backend`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY echo/ ./echo/
COPY api_server.py .
COPY config/ ./config/

# Create data directories
RUN mkdir -p data runtime/logs runtime/plans runtime/exports

EXPOSE 8000

CMD ["python", "api_server.py"]
```

Create `Dockerfile.frontend`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Build application
COPY frontend/ .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
      - ./runtime:/app/runtime
      - ./config:/app/config
    env_file:
      - .env
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  # Optional: Database (if using PostgreSQL instead of SQLite)
  # postgres:
  #   image: postgres:15
  #   environment:
  #     POSTGRES_DB: echo
  #     POSTGRES_USER: echo
  #     POSTGRES_PASSWORD: ${DB_PASSWORD}
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Deploy with Docker

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update and restart
git pull
docker-compose up -d --build
```

## Cloud Deployment

### AWS Deployment

#### Using Elastic Beanstalk

1. **Install EB CLI:**
```bash
pip install awsebcli
```

2. **Initialize EB:**
```bash
eb init -p python-3.11 echo-app
```

3. **Create environment:**
```bash
eb create echo-production
```

4. **Deploy:**
```bash
eb deploy
```

#### Using EC2

```bash
# SSH to EC2 instance
ssh ec2-user@your-instance-ip

# Install dependencies
sudo yum update -y
sudo yum install python311 nodejs18 nginx -y

# Clone repository
git clone https://github.com/your-repo/echo.git
cd echo

# Setup application
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Setup systemd service
sudo tee /etc/systemd/system/echo-api.service << EOF
[Unit]
Description=Echo API Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/echo
Environment="PATH=/home/ec2-user/echo/.venv/bin"
ExecStart=/home/ec2-user/echo/.venv/bin/python api_server.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable echo-api
sudo systemctl start echo-api

# Configure nginx
sudo tee /etc/nginx/conf.d/echo.conf << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /home/ec2-user/echo/frontend/build;
        try_files \$uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo systemctl restart nginx
```

### Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod
```

### Heroku Deployment

Create `Procfile`:
```
web: python api_server.py
release: python -m echo.database_setup
```

Deploy:
```bash
heroku create echo-app
heroku config:set OPENAI_API_KEY=sk-...
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
git push heroku main
```

## Production Checklist

### Security
- [ ] Enable HTTPS/SSL
- [ ] Set strong SECRET_KEY
- [ ] Disable DEBUG mode
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Regular security updates
- [ ] API key rotation schedule

### Performance
- [ ] Enable caching (Redis)
- [ ] Configure CDN for static files
- [ ] Optimize database queries
- [ ] Enable gzip compression
- [ ] Minify JavaScript/CSS
- [ ] Lazy loading for images
- [ ] Connection pooling

### Database
- [ ] Regular backups configured
- [ ] Migration strategy defined
- [ ] Connection pooling enabled
- [ ] Indexes optimized
- [ ] Monitoring queries
- [ ] Backup restoration tested

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Log aggregation
- [ ] Alert configuration
- [ ] Custom metrics

### Configuration
- [ ] Environment variables secured
- [ ] Secrets management system
- [ ] Configuration validation
- [ ] Feature flags setup
- [ ] A/B testing ready

## Monitoring & Maintenance

### Health Checks

```python
# Add to api_server.py
@app.get("/health/live")
async def liveness():
    return {"status": "alive"}

@app.get("/health/ready")
async def readiness():
    # Check database connection
    # Check external services
    return {"status": "ready"}
```

### Logging Configuration

```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    handler = RotatingFileHandler(
        'runtime/logs/echo.log',
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    
    logger = logging.getLogger('echo')
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
```

### Monitoring Setup

```bash
# Prometheus metrics endpoint
@app.get("/metrics")
async def metrics():
    return generate_latest()

# Grafana dashboard configuration
# Import dashboard JSON from monitoring/grafana-dashboard.json
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Backup database
sqlite3 data/echo.db ".backup data/backups/echo-$(date +%Y%m%d).db"

# Backup configuration
tar -czf config-$(date +%Y%m%d).tar.gz config/

# Backup to S3
aws s3 cp data/backups/ s3://echo-backups/ --recursive

# Clean old backups (keep 30 days)
find data/backups -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

## Rollback Procedures

### Quick Rollback

```bash
# Tag before deployment
git tag -a v1.2.3 -m "Release v1.2.3"
git push --tags

# If rollback needed
git checkout v1.2.2
docker-compose up -d --build
```

### Database Rollback

```bash
# Stop application
docker-compose stop backend

# Restore database
sqlite3 data/echo.db ".restore data/backups/echo-20250104.db"

# Start application
docker-compose start backend
```

### Blue-Green Deployment

```nginx
# nginx.conf for blue-green
upstream backend {
    server backend-blue:8000;
    # server backend-green:8000;
}

# Switch by commenting/uncommenting
```

## Troubleshooting

### Common Issues

**Issue**: API not responding
```bash
# Check service status
systemctl status echo-api

# Check logs
journalctl -u echo-api -f

# Test connectivity
curl http://localhost:8000/health
```

**Issue**: Frontend not loading
```bash
# Check nginx status
systemctl status nginx

# Check nginx logs
tail -f /var/log/nginx/error.log

# Verify build files
ls -la frontend/build/
```

**Issue**: Database locked
```bash
# Check for stuck processes
lsof data/echo.db

# Kill stuck process
kill -9 <PID>

# Verify database integrity
sqlite3 data/echo.db "PRAGMA integrity_check;"
```

**Issue**: High memory usage
```bash
# Check memory usage
ps aux | grep python

# Restart with memory limit
docker run -m 2g echo-backend
```

## Performance Tuning

### Backend Optimization

```python
# Use connection pooling
from databases import Database
database = Database('sqlite:///data/echo.db', min_size=5, max_size=20)

# Enable caching
from functools import lru_cache

@lru_cache(maxsize=128)
def get_config():
    return load_config()
```

### Frontend Optimization

```javascript
// Enable service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Lazy load components
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
```

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date);

-- Analyze tables
ANALYZE projects;
VACUUM;
```

## Security Hardening

### SSL/TLS Configuration

```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/echo.crt;
    ssl_certificate_key /etc/ssl/private/echo.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Rate Limiting

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/api/plan")
@limiter.limit("10/minute")
async def generate_plan():
    pass
```

### Security Headers

```python
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response
```

## Maintenance Windows

### Planned Maintenance

```bash
# Notify users (add to frontend)
echo '{"maintenance": true, "message": "Scheduled maintenance at 2 AM UTC"}' > frontend/public/maintenance.json

# During maintenance
docker-compose stop
# Perform updates
docker-compose up -d
```

### Zero-Downtime Deployment

```bash
# Deploy new version to green environment
docker-compose -f docker-compose.green.yml up -d

# Test green environment
curl http://localhost:8001/health

# Switch traffic to green
# Update nginx upstream

# Stop blue environment
docker-compose -f docker-compose.blue.yml down
```

## Support

For deployment issues:
1. Check logs in `runtime/logs/`
2. Review error messages in browser console
3. Verify all environment variables are set
4. Ensure all dependencies are installed
5. Check GitHub Issues for known problems

Remember to always test deployments in a staging environment before production!