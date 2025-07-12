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
 *     summary: Delete a floor plan
 *     tags: [Floor Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Floor plan deleted successfully
 *       404:
 *         description: Floor plan not found
 */
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  db.run('DELETE FROM floor_plans WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

module.exports = router; 