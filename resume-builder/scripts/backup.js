#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Database Backup and Recovery Script
 * 
 * This script handles automated backups of the PostgreSQL database
 * and provides recovery functionality for production environments.
 */

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
    this.databaseUrl = process.env.DATABASE_URL;
    
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a database backup
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);
      
      console.log(`Creating backup: ${backupFile}`);
      
      // Use pg_dump to create backup
      const command = `pg_dump "${this.databaseUrl}" > "${backupFile}"`;
      execSync(command, { stdio: 'inherit' });
      
      // Compress the backup
      const compressedFile = `${backupFile}.gz`;
      execSync(`gzip "${backupFile}"`, { stdio: 'inherit' });
      
      console.log(`Backup created successfully: ${compressedFile}`);
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return compressedFile;
    } catch (error) {
      console.error('Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFile) {
    try {
      console.log(`Restoring from backup: ${backupFile}`);
      
      // Check if file exists
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
      }
      
      // Decompress if needed
      let sqlFile = backupFile;
      if (backupFile.endsWith('.gz')) {
        sqlFile = backupFile.replace('.gz', '');
        execSync(`gunzip -c "${backupFile}" > "${sqlFile}"`, { stdio: 'inherit' });
      }
      
      // Restore database
      const command = `psql "${this.databaseUrl}" < "${sqlFile}"`;
      execSync(command, { stdio: 'inherit' });
      
      // Clean up temporary file if we decompressed
      if (backupFile.endsWith('.gz') && fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }
      
      console.log('Database restored successfully');
    } catch (error) {
      console.error('Restore failed:', error.message);
      throw error;
    }
  }

  /**
   * List available backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            file,
            path: filePath,
            size: this.formatBytes(stats.size),
            created: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return files;
    } catch (error) {
      console.error('Failed to list backups:', error.message);
      return [];
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql.gz'));
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`Deleted old backup: ${file}`);
        }
      }
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old backup(s)`);
      }
    } catch (error) {
      console.error('Cleanup failed:', error.message);
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFile) {
    try {
      console.log(`Verifying backup: ${backupFile}`);
      
      // Check if file exists and is readable
      if (!fs.existsSync(backupFile)) {
        throw new Error('Backup file not found');
      }
      
      const stats = fs.statSync(backupFile);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      // Test decompression if it's a gzipped file
      if (backupFile.endsWith('.gz')) {
        execSync(`gunzip -t "${backupFile}"`, { stdio: 'pipe' });
      }
      
      console.log('Backup verification passed');
      return true;
    } catch (error) {
      console.error('Backup verification failed:', error.message);
      return false;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create backup with metadata
   */
  async createBackupWithMetadata() {
    try {
      const backupFile = await this.createBackup();
      
      // Create metadata file
      const metadataFile = backupFile.replace('.sql.gz', '.json');
      const metadata = {
        timestamp: new Date().toISOString(),
        databaseUrl: this.databaseUrl.replace(/\/\/.*@/, '//***:***@'), // Hide credentials
        backupFile: path.basename(backupFile),
        size: fs.statSync(backupFile).size,
        version: process.env.npm_package_version || '1.0.0'
      };
      
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      
      return { backupFile, metadataFile, metadata };
    } catch (error) {
      console.error('Backup with metadata failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupManager = new BackupManager();
  
  try {
    switch (command) {
      case 'create':
        await backupManager.createBackupWithMetadata();
        break;
        
      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('Usage: node backup.js restore <backup-file>');
          process.exit(1);
        }
        await backupManager.restoreBackup(backupFile);
        break;
        
      case 'list':
        const backups = backupManager.listBackups();
        console.log('Available backups:');
        backups.forEach(backup => {
          console.log(`  ${backup.file} (${backup.size}) - ${backup.created}`);
        });
        break;
        
      case 'cleanup':
        await backupManager.cleanupOldBackups();
        break;
        
      case 'verify':
        const verifyFile = process.argv[3];
        if (!verifyFile) {
          console.error('Usage: node backup.js verify <backup-file>');
          process.exit(1);
        }
        const isValid = await backupManager.verifyBackup(verifyFile);
        process.exit(isValid ? 0 : 1);
        break;
        
      default:
        console.log('Usage: node backup.js <command>');
        console.log('Commands:');
        console.log('  create          - Create a new backup');
        console.log('  restore <file>  - Restore from backup file');
        console.log('  list            - List available backups');
        console.log('  cleanup         - Remove old backups');
        console.log('  verify <file>   - Verify backup integrity');
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

module.exports = BackupManager;