const fs = require('fs');
const path = require('path');
const { getDatabasePath } = require('../config');

/**
 * Backup service module for the Electrical Panel Mapper backend
 * Handles database backup functionality for Home Assistant addon
 */

/**
 * Create a database backup
 * @param {Object} options - Backup options from Home Assistant addon
 * @returns {Promise<string>} Path to the created backup file
 */
const createDatabaseBackup = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!options.database_backup) {
      resolve(null);
      return;
    }

    try {
      const dbPath = getDatabasePath();
      const backupDir = '/data/backups';

      // Create backup directory if it doesn't exist
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `database-backup-${timestamp}.db`);

      // Copy database file
      fs.copyFileSync(dbPath, backupPath);

      // Clean up old backups (keep last 7 days)
      cleanupOldBackups(backupDir);

      console.log(`💾 Database backup created: ${backupPath}`);
      resolve(backupPath);

    } catch (error) {
      console.error('❌ Database backup failed:', error.message);
      reject(error);
    }
  });
};

/**
 * Clean up old backup files (keep only the most recent 7)
 * @param {string} backupDir - Directory containing backup files
 */
const cleanupOldBackups = (backupDir) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only the most recent 7 backups
    files.slice(7).forEach(file => {
      try {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old backup: ${file.name}`);
      } catch (error) {
        console.error(`❌ Error deleting backup ${file.name}:`, error.message);
      }
    });

    console.log(`📊 Total backups kept: ${Math.min(files.length, 7)}`);
  } catch (error) {
    console.error('❌ Error cleaning up old backups:', error.message);
  }
};

/**
 * List available backup files
 * @returns {Promise<Array>} Array of backup file information
 */
const listBackups = () => {
  return new Promise((resolve, reject) => {
    try {
      const backupDir = '/data/backups';

      if (!fs.existsSync(backupDir)) {
        resolve([]);
        return;
      }

      const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            created: stats.mtime,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024)
          };
        })
        .sort((a, b) => b.created - a.created);

      resolve(backups);
    } catch (error) {
      console.error('❌ Error listing backups:', error.message);
      reject(error);
    }
  });
};

/**
 * Initialize backup scheduler
 * @param {Object} options - Backup options from Home Assistant addon
 * @returns {NodeJS.Timeout|null} Interval timer or null if backup disabled
 */
const initializeBackupScheduler = (options) => {
  if (!options.database_backup) {
    console.log('📋 Database backup is disabled');
    return null;
  }

  console.log(`⏰ Database backup enabled, interval: ${options.backup_interval} hours`);

  // Create initial backup on startup (delayed)
  setTimeout(() => {
    createDatabaseBackup(options).catch(error => {
      console.error('❌ Initial backup failed:', error.message);
    });
  }, 5000); // 5 second delay after startup

  // Schedule recurring backups
  const backupInterval = options.backup_interval * 60 * 60 * 1000; // Convert hours to milliseconds
  const intervalId = setInterval(() => {
    createDatabaseBackup(options).catch(error => {
      console.error('❌ Scheduled backup failed:', error.message);
    });
  }, backupInterval);

  return intervalId;
};

module.exports = {
  createDatabaseBackup,
  listBackups,
  initializeBackupScheduler,
  cleanupOldBackups
}; 