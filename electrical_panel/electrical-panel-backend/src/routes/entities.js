const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Entity:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         x:
 *           type: number
 *           description: X coordinate
 *         y:
 *           type: number
 *           description: Y coordinate
 *         breaker_id:
 *           type: integer
 *           description: Associated breaker ID
 *         room_id:
 *           type: integer
 *           description: Associated room ID
 *         device_type_id:
 *           type: integer
 *           description: Device type ID
 *         floor_plan_id:
 *           type: integer
 *           description: Floor plan ID
 *         circuit_id:
 *           type: integer
 *           description: Circuit ID
 *         label:
 *           type: string
 *           description: Entity label
 *         voltage:
 *           type: integer
 *           description: Voltage rating
 *         amperage:
 *           type: integer
 *           description: Amperage rating
 *         gfci:
 *           type: boolean
 *           description: GFCI protection
 *         properties:
 *           type: object
 *           description: Additional properties
 *         wattage:
 *           type: integer
 *           description: Power consumption in watts
 */

/**
 * @swagger
 * /entities:
 *   get:
 *     summary: Get all entities
 *     tags: [Entities]
 *     responses:
 *       200:
 *         description: List of entities
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Entity'
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT entities.*, rooms.name AS room_name
    FROM entities
    LEFT JOIN rooms ON entities.room_id = rooms.id
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Parse properties JSON for each entity
    const entities = rows.map(row => {
      if (row.properties) {
        try {
          row.properties = JSON.parse(row.properties);
        } catch (e) {
          row.properties = {};
        }
      } else {
        row.properties = {};
      }

      // Convert GFCI from 0/1 to boolean
      row.gfci = Boolean(row.gfci);

      return row;
    });

    res.json(entities);
  });
});

/**
 * @swagger
 * /entities/{id}:
 *   get:
 *     summary: Get entity by ID
 *     tags: [Entities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Entity details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Entity'
 *       404:
 *         description: Entity not found
 */
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  db.get('SELECT * FROM entities WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Entity Not Found' });
      return;
    }
    
    // Parse properties JSON
    if (row.properties) {
      try {
        row.properties = JSON.parse(row.properties);
      } catch (e) {
        row.properties = {};
      }
    }
    
    res.json(row);
  });
});

/**
 * @swagger
 * /entities:
 *   post:
 *     summary: Create a new entity
 *     tags: [Entities]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Entity'
 *     responses:
 *       201:
 *         description: Entity created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 */
router.post('/', (req, res) => {
  const db = getDatabase();
  const { device_type_id, x, y, breaker_id, room_id, floor_plan_id } = req.body;
  
  const stmt = db.prepare('INSERT INTO entities (device_type_id, x, y, breaker_id, room_id, floor_plan_id) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(device_type_id, x, y, breaker_id, room_id, floor_plan_id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID });
  });
  stmt.finalize();
});

/**
 * @swagger
 * /entities/{id}:
 *   put:
 *     summary: Update an entity
 *     tags: [Entities]
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
 *             $ref: '#/components/schemas/Entity'
 *     responses:
 *       200:
 *         description: Entity updated successfully
 *       404:
 *         description: Entity not found
 */
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  const { type, x, y, breaker_id, circuit_id, device_type_id, room_id } = req.body;

  // Build dynamic query based on provided fields
  const fields = [];
  const values = [];

  if (device_type_id !== undefined || type !== undefined) {
    fields.push('device_type_id = ?');
    values.push(device_type_id || type);
  }
  if (x !== undefined) {
    fields.push('x = ?');
    values.push(x);
  }
  if (y !== undefined) {
    fields.push('y = ?');
    values.push(y);
  }
  if (breaker_id !== undefined) {
    fields.push('breaker_id = ?');
    values.push(breaker_id);
  }
  if (circuit_id !== undefined) {
    fields.push('circuit_id = ?');
    values.push(circuit_id);
  }
  if (room_id !== undefined) {
    fields.push('room_id = ?');
    values.push(room_id);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(id);
  const query = `UPDATE entities SET ${fields.join(', ')} WHERE id = ?`;

  const stmt = db.prepare(query);
  stmt.run(values, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ updated: this.changes });
  });
  stmt.finalize();
});

/**
 * @swagger
 * /entities/{id}:
 *   delete:
 *     summary: Delete an entity
 *     tags: [Entities]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Entity deleted successfully
 *       404:
 *         description: Entity not found
 */
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  db.run('DELETE FROM entities WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

module.exports = router; 