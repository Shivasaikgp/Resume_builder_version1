#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Deployment Script for Resume Builder
 * 
 * This script handles manual deployments and pre-deployment checks
 */

class DeploymentManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'production';
    this.vercelToken = process.env.VERCEL_TOKEN;
    this.projectId = process.env.VERCEL_PROJECT_ID;
    this.orgId = process.env.VERCEL_ORG_ID;
  }

  /**
   * Run pre-deployment checks
   */
  async preDeploymentChecks() {
    console.log('🔍 Running pre-deployment checks...');
    
    const checks = [
      this.checkEnvironmentVariables(),
      this.checkDependencies(),
      this.runTests(),
      this.checkBuildProcess(),
      this.checkDatabaseConnection(),
      this.runSecurityAudit()
    ];

    const results = await Promise.allSettled(checks);
    const failures = results.filter(result => result.status === 'rejected');

    if (failures.length > 0) {
      console.error('❌ Pre-deployment checks failed:');
      failures.forEach((failure, index) => {
        console.error(`  ${index + 1}. ${failure.reason}`);
      });
      throw new Error('Pre-deployment checks failed');
    }

    console.log('✅ All pre-deployment checks passed');
  }

  /**
   * Check required environment variables
   */
  async checkEnvironmentVariables() {
    const required = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Check if secrets are not default values
    if (process.env.NEXTAUTH_SECRET === 'your-secret-key-here') {
      throw new Error('NEXTAUTH_SECRET is still set to default value');
    }

    console.log('✅ Environment variables check passed');
  }

  /**
   * Check dependencies for vulnerabilities
   */
  async checkDependencies() {
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      console.log('✅ Dependency security check passed');
    } catch (error) {
      throw new Error('High or critical vulnerabilities found in dependencies');
    }
  }

  /**
   * Run test suite
   */
  async runTests() {
    try {
      console.log('Running test suite...');
      execSync('npm run test:ci', { stdio: 'inherit' });
      console.log('✅ Test suite passed');
    } catch (error) {
      throw new Error('Test suite failed');
    }
  }

  /**
   * Check build process
   */
  async checkBuildProcess() {
    try {
      console.log('Testing build process...');
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✅ Build process check passed');
    } catch (error) {
      throw new Error('Build process failed');
    }
  }

  /**
   * Check database connection
   */
  async checkDatabaseConnection() {
    try {
      execSync('npx prisma db pull --force', { stdio: 'pipe' });
      console.log('✅ Database connection check passed');
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }

  /**
   * Run security audit
   */
  async runSecurityAudit() {
    try {
      execSync('npx audit-ci --config audit-ci.json', { stdio: 'pipe' });
      console.log('✅ Security audit passed');
    } catch (error) {
      console.warn('⚠️  Security audit found issues (continuing with deployment)');
    }
  }

  /**
   * Create pre-deployment backup
   */
  async createBackup() {
    try {
      console.log('📦 Creating pre-deployment backup...');
      const BackupManager = require('./backup');
      const backupManager = new BackupManager();
      const result = await backupManager.createBackupWithMetadata();
      console.log(`✅ Backup created: ${result.backupFile}`);
      return result;
    } catch (error) {
      console.warn('⚠️  Backup creation failed:', error.message);
      return null;
    }
  }

  /**
   * Deploy to Vercel
   */
  async deployToVercel(production = true) {
    try {
      console.log(`🚀 Deploying to Vercel (${production ? 'production' : 'preview'})...`);
      
      const args = production ? '--prod' : '';
      const command = `vercel ${args} --token ${this.vercelToken}`;
      
      const output = execSync(command, { encoding: 'utf8' });
      const deploymentUrl = output.trim().split('\n').pop();
      
      console.log(`✅ Deployment successful: ${deploymentUrl}`);
      return deploymentUrl;
    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error.message}`);
    }
  }

  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      console.log('🗄️  Running database migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Database migrations completed');
    } catch (error) {
      throw new Error(`Database migration failed: ${error.message}`);
    }
  }

  /**
   * Health check after deployment
   */
  async healthCheck(url) {
    try {
      console.log('🏥 Running health check...');
      
      // Wait for deployment to be ready
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      const healthUrl = `${url}/health`;
      const response = await fetch(healthUrl);
      
      if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
      
      const health = await response.json();
      
      if (health.status !== 'healthy') {
        throw new Error(`Application is not healthy: ${health.status}`);
      }
      
      console.log('✅ Health check passed');
      return health;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Send deployment notification
   */
  async sendNotification(success, deploymentUrl, error = null) {
    const message = success 
      ? `✅ Deployment successful: ${deploymentUrl}`
      : `❌ Deployment failed: ${error?.message || 'Unknown error'}`;
    
    console.log(message);
    
    // Add notification integrations here (Slack, Discord, email, etc.)
    // Example:
    // await this.sendSlackNotification(message);
    // await this.sendEmailNotification(message);
  }

  /**
   * Full deployment process
   */
  async deploy(options = {}) {
    const { 
      skipChecks = false, 
      skipBackup = false, 
      production = true,
      skipMigrations = false 
    } = options;

    let deploymentUrl = null;
    let backup = null;

    try {
      console.log('🚀 Starting deployment process...');
      
      if (!skipChecks) {
        await this.preDeploymentChecks();
      }
      
      if (!skipBackup) {
        backup = await this.createBackup();
      }
      
      deploymentUrl = await this.deployToVercel(production);
      
      if (!skipMigrations) {
        await this.runMigrations();
      }
      
      await this.healthCheck(deploymentUrl);
      
      await this.sendNotification(true, deploymentUrl);
      
      console.log('🎉 Deployment completed successfully!');
      console.log(`📍 Application URL: ${deploymentUrl}`);
      
      return { success: true, url: deploymentUrl, backup };
      
    } catch (error) {
      console.error('💥 Deployment failed:', error.message);
      
      await this.sendNotification(false, deploymentUrl, error);
      
      if (backup) {
        console.log(`📦 Backup available for rollback: ${backup.backupFile}`);
      }
      
      throw error;
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(backupFile) {
    try {
      console.log('🔄 Starting rollback process...');
      
      if (backupFile) {
        const BackupManager = require('./backup');
        const backupManager = new BackupManager();
        await backupManager.restoreBackup(backupFile);
      }
      
      // Trigger redeployment of previous version
      // This would depend on your specific rollback strategy
      
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('💥 Rollback failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const deploymentManager = new DeploymentManager();
  
  try {
    switch (command) {
      case 'check':
        await deploymentManager.preDeploymentChecks();
        break;
        
      case 'deploy':
        const production = process.argv.includes('--production');
        const skipChecks = process.argv.includes('--skip-checks');
        const skipBackup = process.argv.includes('--skip-backup');
        const skipMigrations = process.argv.includes('--skip-migrations');
        
        await deploymentManager.deploy({
          production,
          skipChecks,
          skipBackup,
          skipMigrations
        });
        break;
        
      case 'rollback':
        const backupFile = process.argv[3];
        await deploymentManager.rollback(backupFile);
        break;
        
      default:
        console.log('Usage: node deploy.js <command>');
        console.log('Commands:');
        console.log('  check                    - Run pre-deployment checks');
        console.log('  deploy [options]         - Deploy application');
        console.log('    --production           - Deploy to production');
        console.log('    --skip-checks          - Skip pre-deployment checks');
        console.log('    --skip-backup          - Skip backup creation');
        console.log('    --skip-migrations      - Skip database migrations');
        console.log('  rollback <backup-file>   - Rollback to previous version');
        process.exit(1);
    }
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DeploymentManager;