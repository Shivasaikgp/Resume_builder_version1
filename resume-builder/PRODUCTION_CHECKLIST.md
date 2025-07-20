# Production Deployment Checklist

Use this checklist before deploying to production to ensure everything is properly configured.

## Pre-Deployment Checklist

### Environment Configuration
- [ ] All required environment variables are set in production
- [ ] `NEXTAUTH_SECRET` is a strong, unique value (not default)
- [ ] `DATABASE_URL` points to production database with SSL enabled
- [ ] `REDIS_URL` is configured for production Redis instance
- [ ] AI service API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) are valid
- [ ] `NEXTAUTH_URL` matches production domain
- [ ] `NODE_ENV` is set to "production"

### Database Setup
- [ ] Production database is created and accessible
- [ ] Database migrations have been run (`npx prisma migrate deploy`)
- [ ] Database connection uses SSL (`?sslmode=require`)
- [ ] Database user has appropriate permissions (not superuser)
- [ ] Database backups are configured
- [ ] Connection pooling is configured if needed

### Security Configuration
- [ ] HTTPS is enabled and certificates are valid
- [ ] Security headers are configured (CSP, HSTS, etc.)
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Sensitive data is not exposed in client-side code
- [ ] API keys are not committed to version control

### Performance Optimization
- [ ] Redis caching is enabled and configured
- [ ] Database queries are optimized with proper indexes
- [ ] CDN is configured for static assets
- [ ] Image optimization is enabled
- [ ] Gzip compression is enabled
- [ ] Bundle size is optimized

### Monitoring and Logging
- [ ] Health check endpoints are working (`/health`, `/api/health`)
- [ ] Metrics endpoint is configured (`/api/metrics`)
- [ ] Log level is set appropriately (`LOG_LEVEL=info`)
- [ ] Error tracking is configured (Sentry, etc.)
- [ ] Monitoring dashboards are set up
- [ ] Alerting is configured for critical issues

### Testing
- [ ] All unit tests pass (`npm run test:unit`)
- [ ] Integration tests pass (`npm run test:integration`)
- [ ] End-to-end tests pass (`npm run test:e2e`)
- [ ] Security audit passes (`npm audit`)
- [ ] Build process completes successfully (`npm run build`)
- [ ] Application starts without errors (`npm start`)

### Backup and Recovery
- [ ] Backup system is configured and tested
- [ ] Backup retention policy is set
- [ ] Recovery procedures are documented and tested
- [ ] Backup verification is working
- [ ] Automated backup schedule is configured

### CI/CD Pipeline
- [ ] GitHub Actions workflow is configured
- [ ] All required secrets are set in GitHub
- [ ] Deployment pipeline runs successfully
- [ ] Rollback procedures are tested
- [ ] Branch protection rules are configured

## Deployment Steps

### 1. Pre-Deployment Checks
```bash
npm run deploy:check
```

### 2. Create Backup
```bash
npm run backup:create
```

### 3. Deploy Application
```bash
# Automated deployment
npm run deploy

# Or manual Vercel deployment
vercel --prod
```

### 4. Run Database Migrations
```bash
npx prisma migrate deploy
```

### 5. Health Check
```bash
curl -f https://your-domain.com/health
```

### 6. Verify Functionality
- [ ] User registration works
- [ ] User login works
- [ ] Resume creation works
- [ ] AI suggestions work
- [ ] PDF export works
- [ ] All critical user flows work

## Post-Deployment Checklist

### Immediate Verification (0-15 minutes)
- [ ] Application is accessible at production URL
- [ ] Health checks are passing
- [ ] No critical errors in logs
- [ ] Database connections are working
- [ ] Redis cache is working
- [ ] AI services are responding

### Short-term Monitoring (15 minutes - 2 hours)
- [ ] Monitor error rates and response times
- [ ] Check for memory leaks or performance issues
- [ ] Verify user registration and login flows
- [ ] Test AI functionality with real requests
- [ ] Monitor database performance
- [ ] Check backup creation

### Long-term Monitoring (2+ hours)
- [ ] Monitor user activity and engagement
- [ ] Check for any performance degradation
- [ ] Verify automated backups are running
- [ ] Monitor resource usage (CPU, memory, disk)
- [ ] Review error logs for patterns
- [ ] Check AI service usage and costs

## Rollback Procedures

If issues are detected after deployment:

### Quick Rollback
1. **Identify the issue**
   - Check health endpoints
   - Review error logs
   - Monitor system metrics

2. **Rollback application**
   ```bash
   # Vercel rollback
   vercel rollback
   
   # Or restore from backup
   npm run backup:restore path/to/backup.sql.gz
   ```

3. **Verify rollback**
   - Test critical functionality
   - Check health endpoints
   - Monitor error rates

### Emergency Procedures
1. **Enable maintenance mode**
   ```bash
   # Set maintenance mode
   vercel env add MAINTENANCE_MODE true
   ```

2. **Investigate and fix**
   - Identify root cause
   - Apply fixes
   - Test in staging environment

3. **Restore service**
   - Deploy fixed version
   - Disable maintenance mode
   - Monitor closely

## Maintenance Tasks

### Daily
- [ ] Check error logs
- [ ] Monitor performance metrics
- [ ] Verify backup completion

### Weekly
- [ ] Review security alerts
- [ ] Check dependency updates
- [ ] Analyze performance trends
- [ ] Review user feedback

### Monthly
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Backup restoration test
- [ ] Disaster recovery drill

### Quarterly
- [ ] Full security assessment
- [ ] Capacity planning review
- [ ] Update disaster recovery procedures
- [ ] Review and update documentation

## Emergency Contacts

- **Development Team**: [contact information]
- **DevOps Team**: [contact information]
- **Database Administrator**: [contact information]
- **Security Team**: [contact information]

## Important URLs

- **Production Application**: https://your-domain.com
- **Health Check**: https://your-domain.com/health
- **Metrics**: https://your-domain.com/api/metrics
- **Monitoring Dashboard**: [monitoring URL]
- **Error Tracking**: [error tracking URL]

## Notes

- Always test in staging environment before production deployment
- Keep this checklist updated with any new requirements
- Document any deviations from standard procedures
- Communicate deployment status to stakeholders