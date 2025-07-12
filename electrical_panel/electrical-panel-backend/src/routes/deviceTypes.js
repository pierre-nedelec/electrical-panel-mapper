const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DeviceType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         name:
 *           type: string
 *           description: Device type name
 *         icon:
 *           type: string
 *           description: Icon identifier
 *         fields:
 *           type: string
 *           description: JSON string of custom fields
 *         is_custom:
 *           type: boolean
 *           description: Whether this is a custom user-created type
 *         created_by_user:
 *           type: boolean
 *           description: Whether created by user vs system
 *         category:
 *           type: string
 *           description: Device category (lighting, receptacle, appliance, etc.)
 *         default_wattage:
 *           type: integer
 *           description: Default power consumption in watts
 *         default_voltage:
 *           type: integer
 *           description: Default voltage rating
 *         default_amperage:
 *           type: integer
 *           description: Default amperage rating
 *         requires_gfci:
 *           type: boolean
 *           description: Whether device requires GFCI protection
 *         requires_afci:
 *           type: boolean
 *           description: Whether device requires AFCI protection
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /device-types:
 *   get:
 *     summary: Get all device types
 *     tags: [Device Types]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: custom_only
 *         schema:
 *           type: boolean
 *         description: Return only custom device types
 *       - in: query
 *         name: include_defaults
 *         schema:
 *           type: boolean
 *         description: Include default system types (default true)
 *     responses:
 *       200:
 *         description: List of device types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeviceType'
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  const { category, custom_only, include_defaults = 'true' } = req.query;
  
  let query = 'SELECT * FROM device_types WHERE 1=1';
  let params = [];
  
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  if (custom_only === 'true') {
    query += ' AND is_custom = 1';
  } else if (include_defaults === 'false') {
    query += ' AND is_custom = 1';
  }
  
  query += ' ORDER BY category, name';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse fields JSON and convert boolean values
    const deviceTypes = rows.map(row => {
      if (row.fields) {
        try {
          row.fields = JSON.parse(row.fields);
        } catch (e) {
          row.fields = {};
        }
      } else {
        row.fields = {};
      }
      
      // Convert boolean values
      row.is_custom = Boolean(row.is_custom);
      row.created_by_user = Boolean(row.created_by_user);
      row.requires_gfci = Boolean(row.requires_gfci);
      row.requires_afci = Boolean(row.requires_afci);
      
      return row;
    });
    
    res.json(deviceTypes);
  });
});

/**
 * @swagger
 * /device-types/categories:
 *   get:
 *     summary: Get all device type categories
 *     tags: [Device Types]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                   count:
 *                     type: integer
 */
router.get('/categories', (req, res) => {
  const db = getDatabase();
  
  db.all(`
    SELECT category, COUNT(*) as count
    FROM device_types
    GROUP BY category
    ORDER BY category
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

/**
 * @swagger
 * /device-types/{id}:
 *   get:
 *     summary: Get device type by ID
 *     tags: [Device Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device type details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceType'
 *       404:
 *         description: Device type not found
 */
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  db.get('SELECT * FROM device_types WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Device type not found' });
      return;
    }
    
    // Parse fields JSON
    if (row.fields) {
      try {
        row.fields = JSON.parse(row.fields);
      } catch (e) {
        row.fields = {};
      }
    }
    
    // Convert boolean values
    row.is_custom = Boolean(row.is_custom);
    row.created_by_user = Boolean(row.created_by_user);
    row.requires_gfci = Boolean(row.requires_gfci);
    row.requires_afci = Boolean(row.requires_afci);
    
    res.json(row);
  });
});

/**
 * @swagger
 * /device-types:
 *   post:
 *     summary: Create a new custom device type
 *     tags: [Device Types]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Device type name
 *               icon:
 *                 type: string
 *                 description: Icon identifier
 *               category:
 *                 type: string
 *                 description: Device category
 *               default_wattage:
 *                 type: integer
 *                 description: Default power consumption in watts
 *               default_voltage:
 *                 type: integer
 *                 description: Default voltage rating
 *               default_amperage:
 *                 type: integer
 *                 description: Default amperage rating
 *               requires_gfci:
 *                 type: boolean
 *                 description: Whether device requires GFCI protection
 *               requires_afci:
 *                 type: boolean
 *                 description: Whether device requires AFCI protection
 *               fields:
 *                 type: object
 *                 description: Custom fields configuration
 *     responses:
 *       201:
 *         description: Device type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceType'
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Device type name already exists
 */
router.post('/', (req, res) => {
  const db = getDatabase();
  const {
    name,
    icon = 'Device',
    category = 'general',
    default_wattage = 0,
    default_voltage = 120,
    default_amperage = 15,
    requires_gfci = false,
    requires_afci = false,
    fields = {}
  } = req.body;
  
  if (!name || !category) {
    res.status(400).json({ error: 'Name and category are required' });
    return;
  }
  
  // Check if name already exists
  db.get('SELECT id FROM device_types WHERE LOWER(name) = LOWER(?)', [name], (err, existingType) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existingType) {
      res.status(409).json({ error: `Device type "${name}" already exists` });
      return;
    }
    
    const stmt = db.prepare(`
      INSERT INTO device_types (
        name, icon, category, default_wattage, default_voltage, default_amperage,
        requires_gfci, requires_afci, fields, is_custom, created_by_user
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `);
    
    stmt.run(
      name,
      icon,
      category,
      default_wattage,
      default_voltage,
      default_amperage,
      requires_gfci ? 1 : 0,
      requires_afci ? 1 : 0,
      JSON.stringify(fields),
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Return the created device type
        db.get('SELECT * FROM device_types WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          
          // Parse fields and convert booleans
          if (row.fields) {
            try {
              row.fields = JSON.parse(row.fields);
            } catch (e) {
              row.fields = {};
            }
          }
          
          row.is_custom = Boolean(row.is_custom);
          row.created_by_user = Boolean(row.created_by_user);
          row.requires_gfci = Boolean(row.requires_gfci);
          row.requires_afci = Boolean(row.requires_afci);
          
          res.status(201).json(row);
        });
      }
    );
    stmt.finalize();
  });
});

/**
 * @swagger
 * /device-types/{id}:
 *   put:
 *     summary: Update a custom device type
 *     tags: [Device Types]
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
 *             $ref: '#/components/schemas/DeviceType'
 *     responses:
 *       200:
 *         description: Device type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceType'
 *       400:
 *         description: Cannot modify system device type
 *       404:
 *         description: Device type not found
 */
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  const {
    name,
    icon,
    category,
    default_wattage,
    default_voltage,
    default_amperage,
    requires_gfci,
    requires_afci,
    fields
  } = req.body;
  
  // First check if this is a custom device type
  db.get('SELECT is_custom FROM device_types WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Device type not found' });
      return;
    }
    if (!row.is_custom) {
      res.status(400).json({ error: 'Cannot modify system device types' });
      return;
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      values.push(icon);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      values.push(category);
    }
    if (default_wattage !== undefined) {
      updateFields.push('default_wattage = ?');
      values.push(default_wattage);
    }
    if (default_voltage !== undefined) {
      updateFields.push('default_voltage = ?');
      values.push(default_voltage);
    }
    if (default_amperage !== undefined) {
      updateFields.push('default_amperage = ?');
      values.push(default_amperage);
    }
    if (requires_gfci !== undefined) {
      updateFields.push('requires_gfci = ?');
      values.push(requires_gfci ? 1 : 0);
    }
    if (requires_afci !== undefined) {
      updateFields.push('requires_afci = ?');
      values.push(requires_afci ? 1 : 0);
    }
    if (fields !== undefined) {
      updateFields.push('fields = ?');
      values.push(JSON.stringify(fields));
    }
    
    if (updateFields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    
    values.push(id);
    const query = `UPDATE device_types SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const stmt = db.prepare(query);
    stmt.run(values, function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Return the updated device type
      db.get('SELECT * FROM device_types WHERE id = ?', [id], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        // Parse fields and convert booleans
        if (row.fields) {
          try {
            row.fields = JSON.parse(row.fields);
          } catch (e) {
            row.fields = {};
          }
        }
        
        row.is_custom = Boolean(row.is_custom);
        row.created_by_user = Boolean(row.created_by_user);
        row.requires_gfci = Boolean(row.requires_gfci);
        row.requires_afci = Boolean(row.requires_afci);
        
        res.json(row);
      });
    });
    stmt.finalize();
  });
});

/**
 * @swagger
 * /device-types/{id}:
 *   delete:
 *     summary: Delete a custom device type
 *     tags: [Device Types]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Device type deleted successfully
 *       400:
 *         description: Cannot delete system device type or device type in use
 *       404:
 *         description: Device type not found
 */
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  // Check if this is a custom device type and not in use
  db.get(`
    SELECT dt.is_custom, COUNT(e.id) as usage_count
    FROM device_types dt
    LEFT JOIN entities e ON dt.id = e.device_type_id
    WHERE dt.id = ?
    GROUP BY dt.id
  `, [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Device type not found' });
      return;
    }
    if (!row.is_custom) {
      res.status(400).json({ error: 'Cannot delete system device types' });
      return;
    }
    if (row.usage_count > 0) {
      res.status(400).json({ 
        error: `Cannot delete device type - it is used by ${row.usage_count} component(s)` 
      });
      return;
    }
    
    db.run('DELETE FROM device_types WHERE id = ?', [id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ deleted: this.changes });
    });
  });
});

module.exports = router; 