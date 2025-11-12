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
    type, // Accept but ignore this field (for backward compatibility)
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
    INSERT INTO entities (floor_plan_id, x, y, room_id, device_type_id, label, amperage, gfci, properties, wattage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    floor_plan_id,
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
    type, // Accept but ignore this field (for backward compatibility)
    x,
    y,
    room_id,
    device_type_id,
    label,
    amperage,
    gfci,
    properties = {},
    circuit_id,
    wattage = 0,
    voltage
  } = req.body;

  // Log the incoming request
  console.log(`📝 PUT /api/electrical/components/${id} from ${req.ip}`);
  console.log(`📦 Request body:`, JSON.stringify(req.body, null, 2));

  // Build dynamic query based on provided fields
  const fields = [];
  const values = [];

  if (x !== undefined) {
    fields.push('x = ?');
    values.push(x);
  }
  if (y !== undefined) {
    fields.push('y = ?');
    values.push(y);
  }
  if (room_id !== undefined) {
    fields.push('room_id = ?');
    values.push(room_id);
  }
  if (device_type_id !== undefined) {
    fields.push('device_type_id = ?');
    values.push(device_type_id);
    console.log(`🔧 Setting device_type_id to: ${device_type_id}`);
  }
  if (label !== undefined) {
    fields.push('label = ?');
    values.push(label);
  }
  if (amperage !== undefined) {
    fields.push('amperage = ?');
    values.push(amperage);
  }
  if (voltage !== undefined) {
    fields.push('voltage = ?');
    values.push(voltage);
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
  if (circuit_id !== undefined) {
    fields.push('circuit_id = ?');
    values.push(circuit_id);
  }

  if (fields.length === 0) {
    console.log(`❌ No fields to update for component ${id}`);
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

    console.log(`✅ Updated ${this.changes} rows for component ${id}`);

    // Return the updated component with all properties
    db.get('SELECT * FROM entities WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.log(`❌ Error fetching updated component: ${err.message}`);
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

      console.log(`✅ Returning updated component:`, JSON.stringify(row, null, 2));
      res.json(row);
    });
  });
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

// ================= PANEL EXPORT =================

/**
 * @swagger
 * /electrical/export/panel-schedule/{floor_plan_id}:
 *   get:
 *     summary: Generate panel schedule export data for electrician documentation
 *     tags: [Electrical]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Floor plan ID to export
 *     responses:
 *       200:
 *         description: Panel schedule data formatted for export
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_name:
 *                   type: string
 *                 export_date:
 *                   type: string
 *                 panels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       panel_info:
 *                         type: object
 *                       circuits:
 *                         type: array
 *                       summary:
 *                         type: object
 */
router.get('/export/panel-schedule/:floor_plan_id', async (req, res) => {
  const db = getDatabase();
  const floor_plan_id = req.params.floor_plan_id;

  try {
    // Get floor plan info
    const floorPlan = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM floor_plans WHERE id = ?', [floor_plan_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!floorPlan) {
      res.status(404).json({ error: 'Floor plan not found' });
      return;
    }

    // Get all panels for this floor plan
    const panels = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM electrical_panels WHERE floor_plan_id = ? ORDER BY panel_name', [floor_plan_id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get device types for component classification
    const deviceTypes = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM device_types', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Create device type lookup
    const deviceTypeMap = {};
    deviceTypes.forEach(dt => {
      deviceTypeMap[dt.id] = dt.name;
    });

    // Get rooms from rooms table (which maps integer IDs to svg_ref)
    const roomsTable = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM rooms', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get rooms from floor_plans.rooms_data JSON (this has the actual names)
    let roomsFromFloorPlan = [];
    if (floorPlan.rooms_data) {
      try {
        roomsFromFloorPlan = JSON.parse(floorPlan.rooms_data);
      } catch (e) {
        console.error('Error parsing rooms_data:', e);
        roomsFromFloorPlan = [];
      }
    }

    // Create a mapping from svg_ref to room name
    const svgRefToName = {};
    roomsFromFloorPlan.forEach(room => {
      if (room.id && room.name) {
        svgRefToName[room.id] = room.name;
      }
    });

    // Create final room mapping: integer room_id -> room name
    const roomMap = {};
    roomsTable.forEach(room => {
      if (room.svg_ref && svgRefToName[room.svg_ref]) {
        roomMap[room.id] = svgRefToName[room.svg_ref];
      }
    });





    // Process each panel
    const panelExportData = await Promise.all(panels.map(async (panel) => {
      // Get circuits for this panel
      const circuits = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM electrical_circuits WHERE panel_id = ? ORDER BY breaker_position',
          [panel.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      // Process each circuit
      const circuitData = await Promise.all(circuits.map(async (circuit) => {
        // Get components connected to this circuit
        const components = await new Promise((resolve, reject) => {
          db.all(
            `SELECT e.*, dt.name as device_type_name
             FROM entities e 
             LEFT JOIN device_types dt ON e.device_type_id = dt.id 
             WHERE e.circuit_id = ? AND e.floor_plan_id = ?
             ORDER BY e.room_id, dt.name, e.label`,
            [circuit.id, floor_plan_id],
            (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            }
          );
        });

        // Group components by type and room
        const componentsByRoom = {};
        const componentsByType = {};
        let totalWattage = 0;

        components.forEach(component => {
          const deviceType = component.device_type_name || 'Unknown Device';
          const wattage = component.wattage || 0;
          
          // Look up room name from our roomMap using the component's room_id
          const roomName = roomMap[component.room_id] || null;
          
          totalWattage += wattage;
          


          // Group by room (only if we have a valid room name)
          if (roomName) {
            if (!componentsByRoom[roomName]) {
              componentsByRoom[roomName] = {};
            }
            if (!componentsByRoom[roomName][deviceType]) {
              componentsByRoom[roomName][deviceType] = [];
            }
            componentsByRoom[roomName][deviceType].push(component);
          } else {
            // Group without room for components with no room assignment
            if (!componentsByRoom['']) {
              componentsByRoom[''] = {};
            }
            if (!componentsByRoom[''][deviceType]) {
              componentsByRoom[''][deviceType] = [];
            }
            componentsByRoom[''][deviceType].push(component);
          }

          // Group by type
          if (!componentsByType[deviceType]) {
            componentsByType[deviceType] = 0;
          }
          componentsByType[deviceType]++;
        });

        // Create human-readable description
        let description = circuit.circuit_label || '';
        const componentDescriptions = [];

        // Add component counts by type and room
        Object.keys(componentsByRoom).forEach(roomName => {
          const roomComponents = componentsByRoom[roomName];
          Object.keys(roomComponents).forEach(deviceType => {
            const count = roomComponents[deviceType].length;
            const items = roomComponents[deviceType];
            
            // Check for special appliances (items with custom labels)
            const namedAppliances = items.filter(item => item.label && item.label.trim()).map(item => item.label);
            
            if (namedAppliances.length > 0) {
              // Special appliances - list by name
              if (roomName === '') {
                // No room name - just list the appliances
                componentDescriptions.push(namedAppliances.join(', '));
              } else {
                // With room name
                componentDescriptions.push(`${roomName}: ${namedAppliances.join(', ')}`);
              }
            } else {
              // Standard components - show count
              const deviceName = deviceType.toLowerCase();
              const deviceText = count === 1 ? deviceName : `${deviceName}s`;
              
              if (roomName === '') {
                // No room name - just show count and type
                componentDescriptions.push(`${count} ${deviceText}`);
              } else {
                // With room name
                componentDescriptions.push(`${roomName}: ${count} ${deviceText}`);
              }
            }
          });
        });

        return {
          breaker_position: circuit.breaker_position,
          secondary_position: circuit.secondary_position,
          circuit_label: circuit.circuit_label || `Circuit ${circuit.breaker_position}`,
          amperage: circuit.amperage,
          voltage: circuit.breaker_type === 'double' || circuit.breaker_type === 'gfci_double' ? 240 : 120,
          wire_gauge: circuit.wire_gauge,
          breaker_type: circuit.breaker_type,
          component_count: components.length,
          total_wattage: totalWattage,
          components_by_room: componentsByRoom,
          components_by_type: componentsByType,
          description: componentDescriptions.length > 0 ? componentDescriptions.join('; ') : description,
          components: components
        };
      }));

      // Calculate panel summary
      const totalCircuits = circuits.length;
      const usedPositions = circuits.length + circuits.filter(c => c.secondary_position).length;
      const totalComponents = circuitData.reduce((sum, circuit) => sum + circuit.component_count, 0);
      const totalLoad = circuitData.reduce((sum, circuit) => sum + circuit.total_wattage, 0);

      return {
        panel_info: {
          id: panel.id,
          name: panel.panel_name,
          main_breaker_amps: panel.main_breaker_amps,
          total_positions: panel.total_positions,
          used_positions: usedPositions,
          available_positions: panel.total_positions - usedPositions,
          panel_type: panel.panel_type
        },
        circuits: circuitData,
        summary: {
          total_circuits: totalCircuits,
          total_components: totalComponents,
          total_load_watts: totalLoad,
          estimated_load_amps: Math.round(totalLoad / 120), // Rough estimate
          panel_utilization: Math.round((usedPositions / panel.total_positions) * 100)
        }
      };
    }));

    // Overall project summary
    const projectSummary = {
      total_panels: panels.length,
      total_circuits: panelExportData.reduce((sum, panel) => sum + panel.summary.total_circuits, 0),
      total_components: panelExportData.reduce((sum, panel) => sum + panel.summary.total_components, 0),
      total_load_watts: panelExportData.reduce((sum, panel) => sum + panel.summary.total_load_watts, 0)
    };

    const exportData = {
      project_name: floorPlan.name,
      export_date: new Date().toISOString(),
      export_timestamp: new Date().toLocaleString(),
      panels: panelExportData,
      summary: projectSummary
    };

    res.json(exportData);

  } catch (error) {
    console.error('Panel export error:', error);
    res.status(500).json({ error: 'Failed to generate panel export data' });
  }
});

module.exports = router; 