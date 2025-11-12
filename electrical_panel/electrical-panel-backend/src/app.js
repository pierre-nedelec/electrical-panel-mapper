const express = require('express');
const path = require('path');
const fs = require('fs');

// Import our modules
const { getPort, getStaticFilesConfig, getAddonOptions } = require('./config');
const { applyMiddleware } = require('./middleware');
const { initializeDatabase } = require('./database');
const { initializeBackupScheduler } = require('./services/backupService');
const { setupSwaggerDocs } = require('./docs/swagger');
const apiRoutes = require('./routes');

/**
 * Initialize and configure the Express application
 * @returns {Promise<express.Application>} Configured Express app
 */
const createApp = async () => {
  // Create Express app
  const app = express();

  // Initialize database
  await initializeDatabase();

  // Apply middleware (CORS, JSON parsing, IP filtering, etc.)
  applyMiddleware(app);

  // Setup API documentation
  setupSwaggerDocs(app);

  // Mount API routes with /api prefix
  app.use('/api', apiRoutes);

  // Handle static file serving based on environment
  const staticConfig = getStaticFilesConfig();
  
  if (staticConfig.shouldServeStatic) {
    console.log(`📁 Serving static files from: ${staticConfig.publicDir}`);
    app.use(express.static(staticConfig.publicDir));

    // Catch-all handler: send back React's index.html file for any non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticConfig.publicDir, 'index.html'));
    });
  } else {
    console.log('🔧 API-only mode: Static files not served (standalone development)');
    
    // In standalone mode, return 404 for non-API routes
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.status(404).json({
          error: 'Not found',
          message: 'This is an API-only server. Frontend should be running separately.',
          api_endpoints: '/api/health, /api/floor-plans, /api/rooms, etc.'
        });
      }
    });
  }

  return app;
};

/**
 * Start the server
 * @returns {Promise<void>}
 */
const startServer = async () => {
  try {
    // Get configuration
    const PORT = getPort();
    const options = getAddonOptions();
    
    console.log('🔧 Add-on options:', options);

    // Create and configure app
    const app = await createApp();

    // Initialize backup scheduler
    initializeBackupScheduler(options);

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🔌 Electrical Panel Mapper Server running on http://0.0.0.0:${PORT}`);
      console.log(`🌐 Web UI available at http://localhost:${PORT}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🐳 Docker container: ${require('./config').isDocker() ? 'Yes' : 'No'}`);
      console.log(`📁 Working directory: ${process.cwd()}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

module.exports = {
  createApp,
  startServer
}; 