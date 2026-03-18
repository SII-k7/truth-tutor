# Deployment Guide

Production deployment guide for Truth Tutor.

## Prerequisites

- Node.js 18+ or Docker
- SQLite3 (included with Node.js)
- SSL certificate (Let's Encrypt recommended)
- Domain name (optional but recommended)

## Environment Variables

Create a `.env` file in the project root:

```bash
# Server Configuration
HOST=0.0.0.0
PORT=3474
NODE_ENV=production

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI Models (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Database
DATABASE_PATH=./data/truth-tutor.db

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: Sentry for error tracking
SENTRY_DSN=https://...
```

## Deployment Options

### Option 1: Docker (Recommended)

#### 1. Build Docker Image

```bash
docker build -t truth-tutor:latest .
```

#### 2. Run with Docker Compose

```bash
docker-compose up -d
```

The `docker-compose.yml` includes:
- Truth Tutor application
- Nginx reverse proxy
- Redis cache (optional)
- Automatic SSL with Let's Encrypt

#### 3. Check Status

```bash
docker-compose ps
docker-compose logs -f truth-tutor
```

### Option 2: PM2 (Node.js Process Manager)

#### 1. Install PM2

```bash
npm install -g pm2
```

#### 2. Start Application

```bash
pm2 start bin/truth-tutor.mjs --name truth-tutor -- serve --host 0.0.0.0 --port 3474
```

#### 3. Configure PM2 Startup

```bash
pm2 startup
pm2 save
```

#### 4. Monitor

```bash
pm2 status
pm2 logs truth-tutor
pm2 monit
```

### Option 3: Systemd Service

#### 1. Create Service File

Create `/etc/systemd/system/truth-tutor.service`:

```ini
[Unit]
Description=Truth Tutor Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/truth-tutor
Environment=NODE_ENV=production
ExecStart=/usr/bin/node bin/truth-tutor.mjs serve --host 0.0.0.0 --port 3474
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 2. Enable and Start

```bash
sudo systemctl enable truth-tutor
sudo systemctl start truth-tutor
sudo systemctl status truth-tutor
```

## Nginx Reverse Proxy

### Configuration

Create `/etc/nginx/sites-available/truth-tutor`:

```nginx
upstream truth_tutor {
    server 127.0.0.1:3474;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    
    # Client Max Body Size (for PDF uploads)
    client_max_body_size 50M;
    
    # Proxy Settings
    location / {
        proxy_pass http://truth_tutor;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket Support
    location /ws {
        proxy_pass http://truth_tutor;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Static Files (if serving separately)
    location /static/ {
        alias /opt/truth-tutor/src/web-ui/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/truth-tutor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Certificate (Let's Encrypt)

### Install Certbot

```bash
sudo apt-get install certbot python3-certbot-nginx
```

### Obtain Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Auto-Renewal

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

## Database Setup

### Initialize Database

```bash
npm run db:init
```

This creates the database and runs all migrations.

### Backup Database

```bash
# Manual backup
./scripts/backup.sh

# Automated daily backups (cron)
0 2 * * * /opt/truth-tutor/scripts/backup.sh
```

### Restore Database

```bash
./scripts/restore.sh /path/to/backup.db
```

## Monitoring

### Health Check Endpoint

```bash
curl https://yourdomain.com/api/info
```

### Logs

#### Docker
```bash
docker-compose logs -f truth-tutor
```

#### PM2
```bash
pm2 logs truth-tutor
```

#### Systemd
```bash
sudo journalctl -u truth-tutor -f
```

### Metrics (Optional)

Install Prometheus and Grafana for advanced monitoring:

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Access Grafana at `http://yourdomain.com:3000`

## Performance Tuning

### Node.js

```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" node bin/truth-tutor.mjs serve
```

### Database

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_annotations_paper_id ON annotations(paper_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(annotation_type);
CREATE INDEX IF NOT EXISTS idx_papers_created_at ON papers(created_at);
```

### Redis Caching

Enable Redis for better performance:

```bash
# Install Redis
sudo apt-get install redis-server

# Configure in .env
REDIS_URL=redis://localhost:6379
```

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS with specific origins
- [ ] Set up firewall (UFW or iptables)
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor error logs
- [ ] Use strong passwords
- [ ] Enable 2FA for admin accounts (if implemented)

## Scaling

### Horizontal Scaling

Use a load balancer (Nginx, HAProxy) with multiple instances:

```nginx
upstream truth_tutor {
    least_conn;
    server 127.0.0.1:3474;
    server 127.0.0.1:3475;
    server 127.0.0.1:3476;
}
```

### Database Scaling

For high traffic, consider:
- PostgreSQL instead of SQLite
- Read replicas
- Connection pooling

### Caching

- Redis for session storage
- CDN for static assets
- HTTP caching headers

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs truth-tutor --lines 100

# Check port availability
sudo lsof -i :3474

# Check environment variables
pm2 env truth-tutor
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart application
pm2 restart truth-tutor
```

### Database Locked

```bash
# Check for long-running queries
sqlite3 data/truth-tutor.db "PRAGMA busy_timeout = 5000;"

# Restart application
pm2 restart truth-tutor
```

### SSL Certificate Issues

```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
```

## Maintenance

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Restart application
pm2 restart truth-tutor
```

### Backups

```bash
# Database
./scripts/backup.sh

# Full backup (including uploads)
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

### Log Rotation

Configure logrotate in `/etc/logrotate.d/truth-tutor`:

```
/var/log/truth-tutor/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/truth-tutor/issues
- Documentation: https://docs.truth-tutor.com
- Email: support@truth-tutor.com
