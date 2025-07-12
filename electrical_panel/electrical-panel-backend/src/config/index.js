const fs = require('fs');
const path = require('path');

/**
 * Configuration module for the Electrical Panel Mapper backend
 * Handles environment detection, port configuration, and Home Assistant addon options
 */

/**
 * Detect if we're running in a Docker container
 * @returns {boolean} True if running in Docker
 */
const isDocker = () => {
  return fs.existsSync('/.dockerenv') || fs.existsSync('/app/package.json');
};

/**
 * Get the appropriate port based on environment
 * @returns {number} Port number to use
 */
const getPort = () => {
  // Force port 8080 in Docker for Home Assistant addon compatibility
  return isDocker() ? 8080 : (process.env.PORT || 3001);
};

/**
 * Get database path based on environment
 * @returns {string} Database file path
 */
const getDatabasePath = () => {
  return process.env.DATABASE_PATH || './database.db';
};

/**
 * Read Home Assistant add-on options
 * @returns {Object} Configuration options
 */
const getAddonOptions = () => {
  try {
    const optionsPath = '/data/options.json';
    if (fs.existsSync(optionsPath)) {
      const optionsData = fs.readFileSync(optionsPath, 'utf8');
      return JSON.parse(optionsData);
    }
  } catch (error) {
    console.log('⚠️ Could not read add-on options, using defaults');
  }

  // Default options
  return {
    log_level: 'info',
    database_backup: false,
    backup_interval: 24
  };
};

/**
 * Get allowed IPs for security filtering
 * @returns {Array<string>} Array of allowed IP addresses
 */
const getAllowedIPs = () => {
  return ['127.0.0.1', '::1', '172.30.32.2', '::ffff:127.0.0.1', '::ffff:172.30.32.2'];
};

/**
 * Check if an IP is allowed
 * @param {string} clientIP - Client IP address
 * @returns {boolean} True if IP is allowed
 */
const isIPAllowed = (clientIP) => {
  const allowedIPs = getAllowedIPs();
  return allowedIPs.includes(clientIP) || clientIP.startsWith('172.30.32.');
};

/**
 * Get static files configuration
 * @returns {Object} Static files configuration
 */
const getStaticFilesConfig = () => {
  const publicDir = path.join(__dirname, '../../public');
  const port = getPort();
  const isFullstackMode = port === 8080;
  const publicExists = fs.existsSync(publicDir);

  return {
    publicDir,
    isFullstackMode,
    publicExists,
    shouldServeStatic: isFullstackMode || publicExists
  };
};

module.exports = {
  isDocker,
  getPort,
  getDatabasePath,
  getAddonOptions,
  getAllowedIPs,
  isIPAllowed,
  getStaticFilesConfig
}; 