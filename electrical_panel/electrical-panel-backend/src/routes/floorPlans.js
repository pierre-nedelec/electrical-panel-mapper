const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FloorPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         name:
 *           type: string
 *           description: Floor plan name
 *         rooms_data:
 *           type: string
 *           description: JSON string of room data
 *         view_box:
 *           type: string
 *           description: SVG viewBox attribute
 *         svg_content:
 *           type: string
 *           description: SVG content
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /floor-plans:
 *   get:
 *     summary: Get all floor plans
 *     tags: [Floor Plans]
 *     responses:
 *       200:
 *         description: List of floor plans
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FloorPlan'
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  console.log('🎯 /floor-plans route handler executed');

  db.all('SELECT * FROM floor_plans ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      console.log('❌ Database error:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }

    console.log(`✅ Found ${rows.length} floor plans`);

    // Parse the rooms_data JSON for each floor plan
    const floorPlans = rows.map(plan => ({
      ...plan,
      rooms: JSON.parse(plan.rooms_data || '[]')
    }));

    console.log('📤 Sending response:', floorPlans);
    res.json(floorPlans);
  });
});

/**
 * @swagger
 * /floor-plans/{id}:
 *   get:
 *     summary: Get a specific floor plan
 *     tags: [Floor Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Floor plan details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FloorPlan'
 *       404:
 *         description: Floor plan not found
 */
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  db.get('SELECT * FROM floor_plans WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Floor plan not found' });
      return;
    }
    
    const floorPlan = {
      ...row,
      rooms: JSON.parse(row.rooms_data || '[]')
    };
    res.json(floorPlan);
  });
});

/**
 * @swagger
 * /floor-plans:
 *   post:
 *     summary: Create a new floor plan
 *     tags: [Floor Plans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FloorPlan'
 *     responses:
 *       201:
 *         description: Floor plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FloorPlan'
 *       400:
 *         description: Floor plan name already exists
 */
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, rooms, viewBox, svg } = req.body;

  // Check for duplicate names
  db.get('SELECT id FROM floor_plans WHERE LOWER(name) = LOWER(?)', [name], (err, existingPlan) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (existingPlan) {
      res.status(400).json({ error: `A floor plan named "${name}" already exists. Please choose a different name.` });
      return;
    }

    const roomsData = JSON.stringify(rooms || []);

    const stmt = db.prepare(`
      INSERT INTO floor_plans (name, rooms_data, view_box, svg_content)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(name, roomsData, viewBox, svg, function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Return the created floor plan data
      db.get('SELECT * FROM floor_plans WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        const newPlan = {
          ...row,
          rooms: JSON.parse(row.rooms_data || '[]')
        };
        res.status(201).json(newPlan);
      });
    });
    stmt.finalize();
  });
});

/**
 * @swagger
 * /floor-plans/{id}:
 *   put:
 *     summary: Update a floor plan
 *     tags: [Floor Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FloorPlan'
 *     responses:
 *       200:
 *         description: Floor plan updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FloorPlan'
 *       404:
 *         description: Floor plan not found
 */
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  const { name, rooms, viewBox, svg } = req.body;
  const roomsData = JSON.stringify(rooms || []);

  const stmt = db.prepare(`
    UPDATE floor_plans
    SET name = ?, rooms_data = ?, view_box = ?, svg_content = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(name, roomsData, viewBox, svg, id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Return the updated floor plan data
    db.get('SELECT * FROM floor_plans WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      const updatedPlan = {
        ...row,
        rooms: JSON.parse(row.rooms_data || '[]')
      };
      res.json(updatedPlan);
    });
  });
  stmt.finalize();
});

/**
 * @swagger
 * /floor-plans/{id}:
 *   delete:
 *     summary: Delete a floor plan and all associated data
 *     tags: [Floor Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor plan ID to delete
 *     responses:
 *       200:
 *         description: Floor plan and all associated data deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 deletedData:
 *                   type: object
 *                   properties:
 *                     entities:
 *                       type: integer
 *                     circuits:
 *                       type: integer
 *                     panels:
 *                       type: integer
 *                     materialsList:
 *                       type: integer
 *                     codeCompliance:
 *                       type: integer
 *                     floorPlan:
 *                       type: integer
 *       404:
 *         description: Floor plan not found
 *       500:
 *         description: Server error during deletion
 */
router.delete('/:id', async (req, res) => {
  const db = getDatabase();
  const floorPlanId = parseInt(req.params.id);
  
  console.log(`🗑️ DELETE /api/floor-plans/${floorPlanId} from ${req.ip}`);
  
  try {
    // First, check if floor plan exists and get its info
    const floorPlan = await new Promise((resolve, reject) => {
      db.get('SELECT id, name FROM floor_plans WHERE id = ?', [floorPlanId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!floorPlan) {
      console.log(`❌ Floor plan ${floorPlanId} not found`);
      return res.status(404).json({ 
        success: false, 
        error: 'Floor plan not found' 
      });
    }
    
    console.log(`🎯 Deleting floor plan: "${floorPlan.name}" (ID: ${floorPlanId})`);
    
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const deletedData = {
      entities: 0,
      circuits: 0,
      panels: 0,
      materialsList: 0,
      codeCompliance: 0,
      floorPlan: 0
    };
    
    try {
      // Step 1: Delete entities
      const entitiesResult = await new Promise((resolve, reject) => {
        db.run('DELETE FROM entities WHERE floor_plan_id = ?', [floorPlanId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
      deletedData.entities = entitiesResult;
      console.log(`  ✅ Deleted ${entitiesResult} entities`);
      
      // Step 2: Get panel IDs to delete circuits
      const panelIds = await new Promise((resolve, reject) => {
        db.all('SELECT id FROM electrical_panels WHERE floor_plan_id = ?', [floorPlanId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.id));
        });
      });
      
      // Step 3: Delete circuits for these panels
      if (panelIds.length > 0) {
        const circuitsResult = await new Promise((resolve, reject) => {
          const placeholders = panelIds.map(() => '?').join(',');
          db.run(`DELETE FROM electrical_circuits WHERE panel_id IN (${placeholders})`, panelIds, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          });
        });
        deletedData.circuits = circuitsResult;
        console.log(`  ✅ Deleted ${circuitsResult} circuits from ${panelIds.length} panels`);
      }
      
      // Step 4: Delete electrical panels
      const panelsResult = await new Promise((resolve, reject) => {
        db.run('DELETE FROM electrical_panels WHERE floor_plan_id = ?', [floorPlanId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
      deletedData.panels = panelsResult;
      console.log(`  ✅ Deleted ${panelsResult} electrical panels`);
      
      // Step 5: Delete materials list (if exists)
      const materialsResult = await new Promise((resolve, reject) => {
        db.run('DELETE FROM materials_list WHERE floor_plan_id = ?', [floorPlanId], function(err) {
          if (err) {
            // Table might not exist, ignore error
            console.log(`  ⚠️ Materials list table not found (skipping)`);
            resolve(0);
          } else {
            resolve(this.changes);
          }
        });
      });
      deletedData.materialsList = materialsResult;
      if (materialsResult > 0) {
        console.log(`  ✅ Deleted ${materialsResult} materials list items`);
      }
      
      // Step 6: Delete code compliance records (if exists)
      const complianceResult = await new Promise((resolve, reject) => {
        db.run('DELETE FROM code_compliance WHERE floor_plan_id = ?', [floorPlanId], function(err) {
          if (err) {
            // Table might not exist, ignore error
            console.log(`  ⚠️ Code compliance table not found (skipping)`);
            resolve(0);
          } else {
            resolve(this.changes);
          }
        });
      });
      deletedData.codeCompliance = complianceResult;
      if (complianceResult > 0) {
        console.log(`  ✅ Deleted ${complianceResult} code compliance records`);
      }
      
      // Step 7: Finally delete the floor plan itself
      const floorPlanResult = await new Promise((resolve, reject) => {
        db.run('DELETE FROM floor_plans WHERE id = ?', [floorPlanId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
      deletedData.floorPlan = floorPlanResult;
      console.log(`  ✅ Deleted floor plan "${floorPlan.name}"`);
      
      // Commit transaction
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const totalDeleted = Object.values(deletedData).reduce((sum, count) => sum + count, 0);
      
      console.log(`🎉 Successfully deleted floor plan "${floorPlan.name}" and ${totalDeleted} related records`);
      
      res.json({ 
        success: true,
        message: `Floor plan "${floorPlan.name}" and all associated data deleted successfully`,
        deletedData
      });
      
    } catch (deleteError) {
      // Rollback transaction on error
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve()); // Don't fail on rollback error
      });
      throw deleteError;
    }
    
  } catch (error) {
    console.error(`❌ Error deleting floor plan ${floorPlanId}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete floor plan',
      details: error.message 
    });
  }
});

module.exports = router; 