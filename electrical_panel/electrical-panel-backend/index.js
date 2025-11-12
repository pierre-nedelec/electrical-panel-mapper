#!/usr/bin/env node

/**
 * Electrical Panel Mapper Backend
 * 
 * A modular Express.js backend for the Electrical Panel Mapper application.
 * This backend supports both local development and Home Assistant addon deployment.
 * 
 * Features:
 * - SQLite database with automatic table creation
 * - RESTful API with OpenAPI/Swagger documentation
 * - Automatic database backups for Home Assistant addon
 * - IP filtering for Home Assistant ingress security
 * - Static file serving for fullstack deployment
 * - Graceful shutdown handling
 * 
 * Architecture:
 * - src/config/     - Configuration and environment detection
 * - src/database/   - Database initialization and management
 * - src/middleware/ - Express middleware (CORS, security, etc.)
 * - src/routes/     - API route handlers organized by feature
 * - src/services/   - Business logic services (backup, etc.)
 * - src/app.js      - Main application setup
 * 
 * @author Electrical Panel Mapper Team
 * @version 2.0.0
 */

const { startServer } = require('./src/app');

// Start the server
if (require.main === module) {
  startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}