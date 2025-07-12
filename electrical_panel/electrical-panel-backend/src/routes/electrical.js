const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ElectricalPanel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         floor_plan_id:
 *           type: integer
 *         panel_name:
 *           type: string
 *         x_position:
 *           type: number
 *         y_position:
 *           type: number
 *         panel_type:
 *           type: string
 *         main_breaker_amps:
 *           type: integer
 *         total_positions:
 *           type: integer
 *     ElectricalCircuit:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         panel_id:
 *           type: integer
 *         breaker_position:
 *           type: integer
 *         breaker_type:
 *           type: string
 *         amperage:
 *           type: integer
 *         wire_gauge:
 *           type: string
 *         circuit_label:
 *           type: string
 *         color_code:
 *           type: string
 *         secondary_position:
 *           type: integer
 */

// ================= ELECTRICAL PANELS =================

/**
 * @swagger
 * /electrical/panels:
 *   get:
 *     summary: Get electrical panels
 *     tags: [Electrical]
 *     parameters:
 *       - in: query
 *         name: floor_plan_id
 *         schema:
 *           type: integer
 *         description: Filter by floor plan ID
 *     responses:
 *       200:
 *         description: List of electrical panels
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ElectricalPanel'
 */
router.get('/panels', (req, res) => {
  const db = getDatabase();
  const { floor_plan_id } = req.query;

  let query = 'SELECT * FROM electrical_panels';
  let params = [];

  if (floor_plan_id) {
    query += ' WHERE floor_plan_id = ?';
    params.push(floor_plan_id);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

/**
 * @swagger
 * /electrical/panels/{id}:
 *   get:
 *     summary: Get specific electrical panel
 *     tags: [Electrical]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Electrical panel details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ElectricalPanel'
 *       404:
 *         description: Panel not found
 */
router.get('/panels/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;

  db.get('SELECT * FROM electrical_panels WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Panel not found' });
      return;
    }
    res.json(row);
  });
});

/**
 * @swagger
 * /electrical/panels:
 *   post:
 *     summary: Create electrical panel
 *     tags: [Electrical]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElectricalPanel'
 *     responses:
 *       201:
 *         description: Panel created successfully
 */
router.post('/panels', (req, res) => {
  const db = getDatabase();
  const { floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions } = req.body;

  const stmt = db.prepare(`
    INSERT INTO electrical_panels (floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions, function (err) {
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
 * /electrical/panels/{id}:
 *   put:
 *     summary: Update electrical panel
 *     tags: [Electrical]
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
 *             $ref: '#/components/schemas/ElectricalPanel'
 *     responses:
 *       200:
 *         description: Panel updated successfully
 */
router.put('/panels/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  const { floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions } = req.body;

  const stmt = db.prepare(`
    UPDATE electrical_panels
    SET floor_plan_id = ?, panel_name = ?, x_position = ?, y_position = ?, panel_type = ?, main_breaker_amps = ?, total_positions = ?
    WHERE id = ?
  `);

  stmt.run(floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions, id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: id, updated: this.changes });
  });
  stmt.finalize();
});

/**
 * @swagger
 * /electrical/panels/{id}:
 *   delete:
 *     summary: Delete electrical panel
 *     tags: [Electrical]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Panel deleted successfully
 */
router.delete('/panels/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;

  db.run('DELETE FROM electrical_panels WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// ================= ELECTRICAL CIRCUITS =================

/**
 * @swagger
 * /electrical/circuits:
 *   get:
 *     summary: Get electrical circuits
 *     tags: [Electrical]
 *     parameters:
 *       - in: query
 *         name: panel_id
 *         schema:
 *           type: integer
 *         description: Filter by panel ID
 *     responses:
 *       200:
 *         description: List of electrical circuits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ElectricalCircuit'
 */
router.get('/circuits', (req, res) => {
  const db = getDatabase();
  const { panel_id } = req.query;

  let query = 'SELECT * FROM electrical_circuits';
  let params = [];

  if (panel_id) {
    query += ' WHERE panel_id = ?';
    params.push(panel_id);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

/**
 * @swagger
 * /electrical/circuits:
 *   post:
 *     summary: Create electrical circuit
 *     tags: [Electrical]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElectricalCircuit'
 *     responses:
 *       201:
 *         description: Circuit created successfully
 */
router.post('/circuits', (req, res) => {
  const db = getDatabase();
  const { panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position } = req.body;

  const stmt = db.prepare(`
    INSERT INTO electrical_circuits (panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position, function (err) {
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
 * /electrical/circuits/{id}:
 *   put:
 *     summary: Update electrical circuit
 *     tags: [Electrical]
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
 *             $ref: '#/components/schemas/ElectricalCircuit'
 *     responses:
 *       200:
 *         description: Circuit updated successfully
 */
router.put('/circuits/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  const { panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position } = req.body;

  const stmt = db.prepare(`
    UPDATE electrical_circuits
    SET panel_id = ?, breaker_position = ?, circuit_label = ?, amperage = ?, wire_gauge = ?, breaker_type = ?, color_code = ?, secondary_position = ?
    WHERE id = ?
  `);

  stmt.run(panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position, id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: id });
  });
  stmt.finalize();
});

/**
 * @swagger
 * /electrical/circuits/{id}:
 *   delete:
 *     summary: Delete electrical circuit
 *     tags: [Electrical]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Circuit deleted successfully
 */
router.delete('/circuits/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;

  db.run('DELETE FROM electrical_circuits WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// ================= ELECTRICAL COMPONENTS =================

/**
 * @swagger
 * /electrical/components:
 *   get:
 *     summary: Get electrical components for a floor plan
 *     tags: [Electrical]
 *     parameters:
 *       - in: query
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor plan ID
 *     responses:
 *       200:
 *         description: List of electrical components
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Entity'
 */
router.get('/components', (req, res) => {
  const db = getDatabase();
  const { floor_plan_id } = req.query;

  if (!floor_plan_id) {
    res.status(400).json({ error: 'floor_plan_id is required' });
    return;
  }

  db.all('SELECT * FROM entities WHERE floor_plan_id = ?', [floor_plan_id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Parse properties JSON for each component
    const components = rows.map(row => {
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

    res.json(components);
  });
});

/**
 * @swagger
 * /electrical/components:
 *   post:
 *     summary: Create electrical component
 *     tags: [Electrical]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Entity'
 *     responses:
 *       201:
 *         description: Component created successfully
 */
router.post('/components', (req, res) => {
  const db = getDatabase();
  const {
    floor_plan_id,
    type,
    x,
    y,
    room_id,
    device_type_id,
    label,
    amperage = 15,
    gfci = false,
    properties = {},
    wattage = 0
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO entities (floor_plan_id, type, x, y, room_id, device_type_id, label, amperage, gfci, properties, wattage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    floor_plan_id,
    type,
    x,
    y,
    room_id,
    device_type_id,
    label,
    amperage,
    gfci ? 1 : 0,
    JSON.stringify(properties),
    wattage,
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Return the complete component with all properties
      db.get('SELECT * FROM entities WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
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

        res.status(201).json(row);
      });
    }
  );
  stmt.finalize();
});

/**
 * @swagger
 * /electrical/components/{id}:
 *   put:
 *     summary: Update electrical component
 *     tags: [Electrical]
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
 *         description: Component updated successfully
 */
router.put('/components/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  const {
    type,
    x,
    y,
    room_id,
    device_type_id,
    label,
    amperage,
    gfci,
    properties = {},
    circuit_id,
    wattage = 0
  } = req.body;

  const stmt = db.prepare(`
    UPDATE entities
    SET type = ?, x = ?, y = ?, room_id = ?, device_type_id = ?, label = ?, amperage = ?, gfci = ?, properties = ?, circuit_id = ?, wattage = ?
    WHERE id = ?
  `);

  stmt.run(
    type,
    x,
    y,
    room_id,
    device_type_id,
    label,
    amperage,
    gfci ? 1 : 0,
    JSON.stringify(properties),
    circuit_id,
    wattage,
    id,
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Return the updated component with all properties
      db.get('SELECT * FROM entities WHERE id = ?', [id], (err, row) => {
        if (err) {
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

        res.json(row);
      });
    }
  );
  stmt.finalize();
});

/**
 * @swagger
 * /electrical/components/{id}:
 *   delete:
 *     summary: Delete electrical component
 *     tags: [Electrical]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Component deleted successfully
 */
router.delete('/components/:id', (req, res) => {
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

// ================= ELECTRICAL SYMBOLS =================

/**
 * @swagger
 * /electrical/symbols:
 *   get:
 *     summary: Get electrical symbols/device types
 *     tags: [Electrical]
 *     responses:
 *       200:
 *         description: List of electrical symbols
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   icon:
 *                     type: string
 *                   fields:
 *                     type: string
 */
router.get('/symbols', (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM device_types', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

module.exports = router; 