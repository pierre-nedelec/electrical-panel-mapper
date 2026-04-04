const express = require('express');
const { createDatabaseBackup, listBackups } = require('../services/backupService');
const { getAddonOptions } = require('../config');

// Import route modules
const entitiesRoutes = require('./entities');
const roomsRoutes = require('./rooms');
const floorPlansRoutes = require('./floorPlans');
const electricalRoutes = require('./electrical');
const deviceTypesRoutes = require('./deviceTypes');
const loadCalculationsRoutes = require('./loadCalculations');
const codeComplianceRoutes = require('./codeCompliance');
const materialsRoutes = require('./materials');

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 port:
 *                   type: integer
 *                 database:
 *                   type: string
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    database: process.env.DATABASE_PATH || './database.db'
  });
});

// ================= BACKUP ENDPOINTS =================

/**
 * @swagger
 * /api/backup/create:
 *   post:
 *     summary: Create a manual database backup
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: Backup created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *       500:
 *         description: Backup failed
 */
router.post('/backup/create', async (req, res) => {
  try {
    const options = getAddonOptions();
    const backupPath = await createDatabaseBackup(options);
    
    res.json({
      success: true,
      message: backupPath ? 'Database backup created successfully' : 'Backup is disabled',
      timestamp: new Date().toISOString(),
      backupPath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Backup failed',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/backup/list:
 *   get:
 *     summary: List available database backups
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: List of available backups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backups:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       filename:
 *                         type: string
 *                       created:
 *                         type: string
 *                       size:
 *                         type: integer
 *                       sizeKB:
 *                         type: integer
 *       500:
 *         description: Failed to list backups
 */
router.get('/backup/list', async (req, res) => {
  try {
    const backups = await listBackups();
    res.json({ backups });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
});

// ================= LEGACY ROUTES (for backward compatibility) =================

// Note: Legacy device-types redirect removed - use /api/device-types directly
// The proper endpoint provides better functionality (filtering, custom types, etc.)

// Legacy breakers routes (deprecated - functionality moved to electrical/circuits)
router.get('/breakers', (req, res) => {
  res.status(410).json({
    error: 'This endpoint has been deprecated. Use /api/electrical/circuits instead.',
    migration: 'The breakers functionality has been integrated into the electrical circuits system.'
  });
});

// Legacy electrical-panels routes (redirect to electrical/panels)
router.get('/electrical-panels', (req, res) => {
  res.redirect('/api/electrical/panels');
});

router.get('/electrical-panels/:id', (req, res) => {
  res.redirect(`/api/electrical/panels/${req.params.id}`);
});

// Legacy electrical-circuits routes (redirect to electrical/circuits)
router.get('/electrical-circuits', (req, res) => {
  res.redirect('/api/electrical/circuits');
});

// ================= MOUNT ROUTE MODULES =================

// Mount all route modules
router.use('/entities', entitiesRoutes);
router.use('/rooms', roomsRoutes);
router.use('/floor-plans', floorPlansRoutes);
router.use('/electrical', electricalRoutes);
router.use('/device-types', deviceTypesRoutes);
router.use('/load-calculations', loadCalculationsRoutes);
router.use('/code-compliance', codeComplianceRoutes);
router.use('/materials', materialsRoutes);

module.exports = router; 