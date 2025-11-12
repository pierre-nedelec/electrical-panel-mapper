const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

/**
 * Swagger/OpenAPI documentation configuration
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Electrical Panel Mapper API',
      version: '2.0.0',
      description: `
        A comprehensive REST API for managing electrical panel mappings and floor plans.
        
        This API supports:
        - Floor plan management with SVG support
        - Electrical component placement and configuration
        - Electrical panel and circuit management
        - Room and device type management
        - Database backup functionality for Home Assistant addon
        
        ## Authentication
        This API uses IP-based filtering for Home Assistant ingress security.
        
        ## Rate Limiting
        No rate limiting is currently implemented.
        
        ## Error Handling
        All endpoints return standard HTTP status codes with JSON error responses.
      `,
      contact: {
        name: 'Electrical Panel Mapper Team',
        url: 'https://github.com/your-org/electrical-panel-mapper'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'API Base URL'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            message: {
              type: 'string',
              description: 'Detailed error description'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'System',
        description: 'System health and status endpoints'
      },
      {
        name: 'Floor Plans',
        description: 'Floor plan management operations'
      },
      {
        name: 'Entities',
        description: 'Electrical entity/component management'
      },
      {
        name: 'Rooms',
        description: 'Room management operations'
      },
      {
        name: 'Electrical',
        description: 'Electrical system management (panels, circuits, components)'
      },
      {
        name: 'Backup',
        description: 'Database backup operations'
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../routes/**/*.js')
  ]
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 * @param {Express} app - Express application instance
 */
const setupSwaggerDocs = (app) => {
  // Serve Swagger UI at /api/docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Electrical Panel Mapper API Documentation'
  }));

  // Serve raw OpenAPI spec at /api/docs/json
  app.get('/api/docs/json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 API Documentation available at /api/docs');
};

module.exports = {
  setupSwaggerDocs,
  swaggerSpec
}; 