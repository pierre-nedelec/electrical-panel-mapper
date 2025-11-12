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
  
  console.log(`📝 GET /api/entities from ${req.ip}`);
  
  db.all(`
    SELECT entities.*, rooms.name AS room_name
    FROM entities
    LEFT JOIN rooms ON entities.room_id = rooms.id
  `, [], (err, rows) => {
    if (err) {
      console.log(`❌ Database error: ${err.message}`);
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

    console.log(`✅ Returning ${entities.length} entities`);
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
  const { 
    device_type_id, 
    x, 
    y, 
    breaker_id, 
    room_id, 
    floor_plan_id,
    label,
    voltage,
    amperage,
    wattage,
    gfci,
    circuit_id,
    properties
  } = req.body;

  // Log the incoming request
  console.log(`📝 POST /api/entities from ${req.ip}`);
  console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));
  
  // Improved wattage handling - ensure we preserve provided wattage values
  const finalWattage = wattage !== undefined && wattage !== null ? wattage : 0;
  
  const stmt = db.prepare(`
    INSERT INTO entities (
      device_type_id, x, y, breaker_id, room_id, floor_plan_id,
      label, voltage, amperage, wattage, gfci, circuit_id, properties
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertValues = [
    device_type_id, 
    x, 
    y, 
    breaker_id, 
    room_id, 
    floor_plan_id,
    label || null,
    voltage || 120,
    amperage || 15,
    finalWattage, // Use improved wattage handling
    gfci ? 1 : 0,
    circuit_id || null,
    JSON.stringify(properties || {})
  ];
  
  console.log(`🔧 Insert values:`, insertValues);
  console.log(`⚡ Final wattage being saved: ${finalWattage} (original: ${wattage})`);
  
  stmt.run(insertValues, function (err) {
    if (err) {
      console.log(`❌ Database error: ${err.message}`);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log(`✅ Created entity with ID: ${this.lastID}`);
    
    // Return the created entity with all properties
    db.get('SELECT * FROM entities WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        console.log(`❌ Error fetching created entity: ${err.message}`);
        res.status(500).json({ error: err.message });
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

      // Convert GFCI from 0/1 to boolean
      row.gfci = Boolean(row.gfci);

      console.log(`✅ Returning created entity:`, JSON.stringify(row, null, 2));
      console.log(`⚡ Entity wattage in response: ${row.wattage}`);
      res.status(201).json(row);
    });
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
  const { 
    type, // Accept but ignore this field (for backward compatibility)
    x, 
    y, 
    breaker_id, 
    circuit_id, 
    device_type_id, 
    room_id,
    label,
    voltage,
    amperage,
    wattage,
    gfci,
    properties
  } = req.body;

  // Log the incoming request
  console.log(`📝 PUT /api/entities/${id} from ${req.ip}`);
  console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));

  // Build dynamic query based on provided fields
  const fields = [];
  const values = [];

  if (device_type_id !== undefined) {
    fields.push('device_type_id = ?');
    values.push(device_type_id);
    console.log(`🔧 Setting device_type_id to: ${device_type_id}`);
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
  if (label !== undefined) {
    fields.push('label = ?');
    values.push(label);
  }
  if (voltage !== undefined) {
    fields.push('voltage = ?');
    values.push(voltage);
  }
  if (amperage !== undefined) {
    fields.push('amperage = ?');
    values.push(amperage);
  }
  if (wattage !== undefined) {
    fields.push('wattage = ?');
    values.push(wattage);
  }
  if (gfci !== undefined) {
    fields.push('gfci = ?');
    values.push(gfci ? 1 : 0);
  }
  if (properties !== undefined) {
    fields.push('properties = ?');
    values.push(JSON.stringify(properties));
  }

  if (fields.length === 0) {
    console.log(`❌ No fields to update for entity ${id}`);
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(id);
  const query = `UPDATE entities SET ${fields.join(', ')} WHERE id = ?`;
  
  console.log(`🔧 SQL Query: ${query}`);
  console.log(`🔧 Values:`, values);

  const stmt = db.prepare(query);
  stmt.run(values, function (err) {
    if (err) {
      console.log(`❌ Database error: ${err.message}`);
      res.status(500).json({ error: err.message });
      return;
    }
    
    console.log(`✅ Updated ${this.changes} rows for entity ${id}`);
    
    // Return the updated entity with all properties
    db.get('SELECT * FROM entities WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.log(`❌ Error fetching updated entity: ${err.message}`);
        res.status(500).json({ error: err.message });
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

      // Convert GFCI from 0/1 to boolean
      row.gfci = Boolean(row.gfci);

      console.log(`✅ Returning updated entity:`, JSON.stringify(row, null, 2));
      res.json(row);
    });
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