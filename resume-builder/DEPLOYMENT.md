# Deployment Guide

This guide covers deploying the Resume Builder application to production environments.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (production instance)
- Redis instance (for caching and sessions)
- Vercel account (for serverless deployment)
- Environment variables configured

## Environment Setup

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
SHADOW_DATABASE_URL="postgresql://username:password@host:port/shadow_database?sslmode=require"

# Authentication
NEXTAUTH_SECRET="your-production-secret-key-minimum-32-characters"
NEXTAUTH_URL="https://your-production-domain.com"

# AI Services
OPENAI_API_KEY="sk-your-openai-api-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key"

# Redis
REDIS_URL="redis://username:password@host:port"

# Monitoring
LOG_LEVEL="info"
ENABLE_METRICS="true"
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
```

### Database Setup

1. **Create Production Database**
   ```bash
   # Connect to your PostgreSQL instance
   createdb resume_builder_production
   ```

2. **Run Migrations**
   ```bash
   npm run db:generate
   npx prisma migrate deploy
   ```

3. **Seed Initial Data** (optional)
   ```bash
   npm run db:seed
   ```

### Redis Setup

Set up a Redis instance for caching and session storage:
- **Upstash Redis** (recommended for Vercel)
- **Redis Cloud**
- **Self-hosted Redis**

## Deployment Options

### Option 1: Vercel Deployment (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Configure Environment Variables**
   ```bash
   # Set environment variables in Vercel dashboard
   # or use the CLI
   vercel env add DATABASE_URL
   vercel env add NEXTAUTH_SECRET
   # ... add all required variables
   ```

4. **Deploy**
   ```bash
   # Automated deployment
   npm run deploy

   # Or manual deployment
   vercel --prod
   ```

### Option 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   npm run docker:build
   ```

2. **Run with Docker Compose**
   ```bash
   # Start all services
   npm run docker:run

   # View logs
   npm run docker:logs

   # Stop services
   npm run docker:stop
   ```

3. **Production Docker Setup**
   ```bash
   # Use production profile
   docker-compose --profile production up -d
   ```

### Option 3: Manual Server Deployment

1. **Build Application**
   ```bash
   npm ci --production
   npm run build
   ```

2. **Start Application**
   ```bash
   npm start
   ```

3. **Use Process Manager**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start npm --name "resume-builder" -- start
   pm2 save
   pm2 startup
   ```

## Pre-Deployment Checklist

Run the pre-deployment checks:

```bash
npm run deploy:check
```

This will verify:
- ✅ Environment variables are set
- ✅ Dependencies are secure
- ✅ Tests pass
- ✅ Build process works
- ✅ Database connection
- ✅ Security audit

## Database Management

### Backup and Recovery

1. **Create Backup**
   ```bash
   npm run backup:create
   ```

2. **List Backups**
   ```bash
   npm run backup:list
   ```

3. **Restore from Backup**
   ```bash
   npm run backup:restore path/to/backup.sql.gz
   ```

4. **Cleanup Old Backups**
   ```bash
   npm run backup:cleanup
   ```

### Automated Backups

Set up automated backups using cron:

```bash
# Add to crontab (daily backup at 2 AM)
0 2 * * * cd /path/to/resume-builder && npm run backup:create
```

## Monitoring and Logging

### Health Checks

The application provides health check endpoints:

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /api/health`
- **Metrics**: `GET /api/metrics` (Prometheus format)

### Monitoring Setup

1. **Enable Monitoring**
   ```bash
   npm run monitoring:up
   ```

2. **Access Dashboards**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin)

### Log Management

Logs are structured and include:
- Request/response logging
- AI service interactions
- Database operations
- Error tracking

Configure log level with `LOG_LEVEL` environment variable:
- `debug`: All logs
- `info`: Info, warn, error
- `warn`: Warn and error only
- `error`: Error only

## Performance Optimization

### Caching Strategy

1. **Redis Caching**
   - AI responses cached for 1 hour
   - User contexts cached for 24 hours
   - Template data cached for 7 days

2. **Database Optimization**
   - Connection pooling enabled
   - Query optimization with indexes
   - Read replicas for scaling

3. **CDN Configuration**
   - Static assets served via CDN
   - Image optimization enabled
   - Gzip compression enabled

### Scaling Considerations

- **Horizontal Scaling**: Multiple application instances
- **Database Scaling**: Read replicas, connection pooling
- **Cache Scaling**: Redis cluster for high availability
- **AI Service Scaling**: Request queuing and rate limiting

## Security

### Security Headers

The application includes security headers:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Rate Limiting

API endpoints are rate-limited:
- General API: 100 requests/minute
- AI endpoints: 20 requests/minute
- Authentication: 5 attempts/minute

### Data Protection

- All data encrypted in transit (HTTPS)
- Database connections use SSL
- Sensitive data encrypted at rest
- Regular security audits

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database connectivity
   npx prisma db pull --force
   ```

2. **AI Service Failures**
   ```bash
   # Check API keys and quotas
   curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   curl http://localhost:3000/health
   ```

4. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .next node_modules
   npm ci
   npm run build
   ```

### Log Analysis

Check application logs for errors:

```bash
# Docker logs
npm run docker:logs

# PM2 logs
pm2 logs resume-builder

# Vercel logs
vercel logs
```

## Rollback Procedures

### Quick Rollback

1. **Identify Last Good Backup**
   ```bash
   npm run backup:list
   ```

2. **Restore Database**
   ```bash
   npm run backup:restore backup-2024-01-15T10-30-00.sql.gz
   ```

3. **Redeploy Previous Version**
   ```bash
   # Vercel
   vercel rollback

   # Docker
   docker-compose down
   docker-compose up -d
   ```

### Emergency Procedures

1. **Take Application Offline**
   ```bash
   # Add maintenance page
   vercel env add MAINTENANCE_MODE true
   ```

2. **Investigate Issue**
   - Check health endpoints
   - Review error logs
   - Monitor system resources

3. **Restore Service**
   - Fix identified issues
   - Run health checks
   - Remove maintenance mode

## Maintenance

### Regular Tasks

- **Weekly**: Review error logs and performance metrics
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Full security audit and penetration testing

### Updates

1. **Dependency Updates**
   ```bash
   npm audit
   npm update
   npm run test:all
   ```

2. **Security Patches**
   ```bash
   npm audit fix
   npm run deploy:check
   ```

3. **Database Maintenance**
   ```bash
   # Analyze and optimize
   npx prisma db pull
   # Review and optimize queries
   ```

## Support

For deployment issues:
1. Check this deployment guide
2. Review application logs
3. Check health endpoints
4. Consult monitoring dashboards
5. Contact development team with specific error details