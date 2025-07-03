// backend/index.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const dbPath = process.env.DATABASE_PATH || './database.db';
const db = new sqlite3.Database(dbPath);

// Create the tables if they don't exist and insert initial device types
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      x REAL,
      y REAL,
      breaker_id INTEGER,
      room_id INTEGER,
      device_type_id INTEGER,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (breaker_id) REFERENCES breakers(id),
      FOREIGN KEY (device_type_id) REFERENCES device_types(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS breakers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER,
      amps INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      svg_ref TEXT UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS device_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      icon TEXT,
      fields TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS floor_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rooms_data TEXT,
      view_box TEXT,
      svg_content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add floor_plan_id to entities table if not exists
  db.run(`
    ALTER TABLE entities ADD COLUMN floor_plan_id INTEGER REFERENCES floor_plans(id)
  `, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding floor_plan_id column:', err.message);
    }
  });

  // Add circuit_id to entities table if not exists
  db.run(`
    ALTER TABLE entities ADD COLUMN circuit_id INTEGER REFERENCES electrical_circuits(id)
  `, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding circuit_id column:', err.message);
    }
  });

  // Add additional component properties columns
  db.run(`
    ALTER TABLE entities ADD COLUMN label TEXT
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE entities ADD COLUMN voltage INTEGER DEFAULT 120
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE entities ADD COLUMN amperage INTEGER DEFAULT 15
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE entities ADD COLUMN gfci BOOLEAN DEFAULT 0
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE entities ADD COLUMN properties TEXT DEFAULT '{}'
  `, (err) => {
    // Ignore error if column already exists
  });

  db.run(`
    ALTER TABLE entities ADD COLUMN wattage INTEGER DEFAULT 0
  `, (err) => {
    // Ignore error if column already exists
  });

  // Create electrical panels table
  db.run(`
    CREATE TABLE IF NOT EXISTS electrical_panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_plan_id INTEGER NOT NULL,
      panel_name TEXT NOT NULL,
      x_position REAL NOT NULL,
      y_position REAL NOT NULL,
      panel_type TEXT NOT NULL,
      main_breaker_amps INTEGER,
      total_positions INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE CASCADE
    )
  `);

  // Create electrical circuits table
  db.run(`
    CREATE TABLE IF NOT EXISTS electrical_circuits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      panel_id INTEGER NOT NULL,
      breaker_position INTEGER NOT NULL,
      breaker_type TEXT NOT NULL DEFAULT 'single',
      amperage INTEGER NOT NULL,
      wire_gauge TEXT DEFAULT '12 AWG',
      circuit_label TEXT,
      color_code TEXT DEFAULT '#000000',
      secondary_position INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (panel_id) REFERENCES electrical_panels(id) ON DELETE CASCADE,
      UNIQUE(panel_id, breaker_position)
    )
  `);
  
  // Add secondary_position column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE electrical_circuits ADD COLUMN secondary_position INTEGER DEFAULT NULL
  `, (err) => {
    // Ignore error if column already exists
  });

  // Create component-circuit relationships table
  db.run(`
    CREATE TABLE IF NOT EXISTS component_circuits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER NOT NULL,
      circuit_id INTEGER NOT NULL,
      load_watts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (circuit_id) REFERENCES electrical_circuits(id) ON DELETE CASCADE,
      UNIQUE(entity_id, circuit_id)
    )
  `);

  // Insert default device types if they don't exist
  db.run(`
    INSERT OR IGNORE INTO device_types (name, icon) VALUES
      ('Light', 'Lightbulb'),
      ('Outlet', 'Outlet'),
      ('Switch', 'ToggleOn'),
      ('Heater', 'LocalFireDepartment'),
      ('Baseboard Heater', 'Thermostat'),
      ('Jacuzzi', 'HotTub'),
      ('Water Heater', 'Water'),
      ('HVAC Unit', 'Air'),
      ('Dryer', 'LocalLaundryService'),
      ('Range/Oven', 'Kitchen'),
      ('Dishwasher', 'Kitchen'),
      ('Garbage Disposal', 'Delete'),
      ('Ceiling Fan', 'Air')
  `);
});

// *************** ENTITIES ***************
app.get('/entities', (req, res) => {
  db.all(`
    SELECT entities.*, rooms.name AS room_name 
    FROM entities 
    LEFT JOIN rooms ON entities.room_id = rooms.id
  `, [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
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

app.get('/entities/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM entities WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).send({ error: 'Internal Server Error' });
      return;
    }
    if (!row) {
      res.status(404).send({ error: 'Entity Not Found' });
      return;
    }
    res.json(row);
  });
});

// Update the POST endpoint to handle room_id and floor_plan_id when adding a new entity
app.post('/entities', (req, res) => {
  const { device_type_id, x, y, breaker_id, room_id, floor_plan_id } = req.body;
  const stmt = db.prepare('INSERT INTO entities (device_type_id, x, y, breaker_id, room_id, floor_plan_id) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(device_type_id, x, y, breaker_id, room_id, floor_plan_id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

// Endpoint to update an existing entity
app.put('/entities/:id', (req, res) => {
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
      res.status(500).send(err.message);
      return;
    }
    res.json({ updated: this.changes });
  });
  stmt.finalize();
});

// Endpoint to delete an entity
app.delete('/entities/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM entities WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// *************** BREAKERS ***************
// Endpoint to get all breakers
app.get('/breakers', (req, res) => {
  db.all('SELECT * FROM breakers', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});

// Endpoint to add a new breaker
app.post('/breakers', (req, res) => {
  const { position, amps } = req.body;
  const stmt = db.prepare('INSERT INTO breakers (position, amps) VALUES (?, ?)');
  stmt.run(position, amps, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

// Endpoint to update an existing breaker
app.put('/breakers/:id', (req, res) => {
  const id = req.params.id;
  const { position, amps } = req.body;
  const stmt = db.prepare('UPDATE breakers SET position = ?, amps = ? WHERE id = ?');
  stmt.run(position, amps, id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ updated: this.changes });
  });
  stmt.finalize();
});

// Endpoint to delete a breaker
app.delete('/breakers/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM breakers WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// *************** ROOMS ***************

// Endpoint to get all rooms
app.get('/rooms', (req, res) => {
  db.all('SELECT * FROM rooms', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});


app.post('/rooms', (req, res) => {
  const { name, svg_ref } = req.body;
  const stmt = db.prepare('INSERT INTO rooms (name, svg_ref) VALUES (?, ?) ON CONFLICT(svg_ref) DO UPDATE SET name = ?');
  stmt.run(name, svg_ref, name, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});
// // Endpoint to add a new room
// app.post('/rooms', (req, res) => {
//   const { name } = req.body;
//   const stmt = db.prepare('INSERT INTO rooms (name) VALUES (?)');
//   stmt.run(name, function (err) {
//     if (err) {
//       res.status(500).send(err.message);
//       return;
//     }
//     res.json({ id: this.lastID });
//   });
//   stmt.finalize();
// });

// Endpoint to delete a room
app.delete('/rooms/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM rooms WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});


// *************** DEVICE TYPES ***************
// Fetch all device types
app.get('/device-types', (req, res) => {
  db.all('SELECT * FROM device_types', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});

// *************** FLOOR PLANS ***************
// Get all floor plans
app.get('/floor-plans', (req, res) => {
  db.all('SELECT * FROM floor_plans ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    // Parse the rooms_data JSON for each floor plan
    const floorPlans = rows.map(plan => ({
      ...plan,
      rooms: JSON.parse(plan.rooms_data || '[]')
    }));
    res.json(floorPlans);
  });
});

// Get a specific floor plan
app.get('/floor-plans/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM floor_plans WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    if (!row) {
      res.status(404).send({ error: 'Floor plan not found' });
      return;
    }
    const floorPlan = {
      ...row,
      rooms: JSON.parse(row.rooms_data || '[]')
    };
    res.json(floorPlan);
  });
});

// Create a new floor plan
app.post('/floor-plans', (req, res) => {
  const { name, rooms, viewBox, svg } = req.body;
  
  // Check for duplicate names
  db.get('SELECT id FROM floor_plans WHERE LOWER(name) = LOWER(?)', [name], (err, existingPlan) => {
    if (err) {
      res.status(500).send(err.message);
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
        res.status(500).send(err.message);
        return;
      }
      
      // Return the created floor plan data
      db.get('SELECT * FROM floor_plans WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          res.status(500).send(err.message);
          return;
        }
        const newPlan = {
          ...row,
          rooms: JSON.parse(row.rooms_data || '[]')
        };
        res.json(newPlan);
      });
    });
    stmt.finalize();
  });
});

// Update a floor plan
app.put('/floor-plans/:id', (req, res) => {
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
      res.status(500).send(err.message);
      return;
    }
    
    // Return the updated floor plan data
    db.get('SELECT * FROM floor_plans WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).send(err.message);
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

// Delete a floor plan
app.delete('/floor-plans/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM floor_plans WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// *************** ELECTRICAL SYSTEM ENDPOINTS ***************

// Get complete electrical data for a floor plan
app.get('/floor-plans/:id/electrical', (req, res) => {
  const floorPlanId = req.params.id;
  
  // Get electrical panels
  db.all('SELECT * FROM electrical_panels WHERE floor_plan_id = ?', [floorPlanId], (err, panels) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    
    // Get electrical components
    db.all('SELECT * FROM entities WHERE floor_plan_id = ?', [floorPlanId], (err, components) => {
      if (err) {
        res.status(500).send(err.message);
        return;
      }
      
      // Get circuits for all panels
      if (panels.length === 0) {
        res.json({ panels: [], components, circuits: [] });
        return;
      }
      
      const panelIds = panels.map(p => p.id);
      const placeholders = panelIds.map(() => '?').join(',');
      
      db.all(`SELECT * FROM electrical_circuits WHERE panel_id IN (${placeholders})`, panelIds, (err, circuits) => {
        if (err) {
          res.status(500).send(err.message);
          return;
        }
        
        res.json({ panels, components, circuits });
      });
    });
  });
});

// Create electrical panel
app.post('/floor-plans/:id/electrical/panels', (req, res) => {
  const floorPlanId = req.params.id;
  const { panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO electrical_panels (floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(floorPlanId, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

// Get electrical components for a floor plan
app.get('/floor-plans/:id/electrical/components', (req, res) => {
  const floorPlanId = req.params.id;
  
  db.all('SELECT * FROM entities WHERE floor_plan_id = ?', [floorPlanId], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
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

// Create electrical component
app.post('/floor-plans/:id/electrical/components', (req, res) => {
  const floorPlanId = req.params.id;
  const { 
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
    floorPlanId, 
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
        res.status(500).send(err.message);
        return;
      }
      
      // Return the complete component with all properties
      db.get('SELECT * FROM entities WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          res.status(500).send(err.message);
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

// Update electrical component
app.put('/electrical/components/:id', (req, res) => {
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
        res.status(500).send(err.message);
        return;
      }
      
      // Return the updated component with all properties
      db.get('SELECT * FROM entities WHERE id = ?', [id], (err, row) => {
        if (err) {
          res.status(500).send(err.message);
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

// Delete electrical component
app.delete('/electrical/components/:id', (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM entities WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Create electrical circuit
app.post('/electrical/circuits', (req, res) => {
  const { panel_id, circuit_number, breaker_type, amperage, wire_gauge, circuit_label, color_code } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO electrical_circuits (panel_id, circuit_number, breaker_type, amperage, wire_gauge, circuit_label, color_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(panel_id, circuit_number, breaker_type, amperage, wire_gauge, circuit_label, color_code, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

// Get electrical panels for a floor plan
app.get('/electrical-panels', (req, res) => {
  const { floor_plan_id } = req.query;
  
  let query = 'SELECT * FROM electrical_panels';
  let params = [];
  
  if (floor_plan_id) {
    query += ' WHERE floor_plan_id = ?';
    params.push(floor_plan_id);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});

// Get specific electrical panel by ID
app.get('/electrical-panels/:id', (req, res) => {
  const id = req.params.id;
  
  db.get('SELECT * FROM electrical_panels WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Panel not found' });
      return;
    }
    res.json(row);
  });
});

// Create electrical panel
app.post('/electrical-panels', (req, res) => {
  const { floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO electrical_panels (floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

// Update electrical panel
app.put('/electrical-panels/:id', (req, res) => {
  const id = req.params.id;
  const { floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions } = req.body;
  
  const stmt = db.prepare(`
    UPDATE electrical_panels 
    SET floor_plan_id = ?, panel_name = ?, x_position = ?, y_position = ?, panel_type = ?, main_breaker_amps = ?, total_positions = ?
    WHERE id = ?
  `);
  
  stmt.run(floor_plan_id, panel_name, x_position, y_position, panel_type, main_breaker_amps, total_positions, id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: id, updated: this.changes });
  });
  stmt.finalize();
});

// Delete electrical panel
app.delete('/electrical-panels/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM electrical_panels WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Get electrical circuits for a panel
app.get('/electrical-circuits', (req, res) => {
  const { panel_id } = req.query;
  
  let query = 'SELECT * FROM electrical_circuits';
  let params = [];
  
  if (panel_id) {
    query += ' WHERE panel_id = ?';
    params.push(panel_id);
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});

// Create electrical circuit
app.post('/electrical-circuits', (req, res) => {
  const { panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO electrical_circuits (panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: this.lastID });
  });
  stmt.finalize();
});

// Update electrical circuit
app.put('/electrical-circuits/:id', (req, res) => {
  const id = req.params.id;
  const { panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position } = req.body;
  
  const stmt = db.prepare(`
    UPDATE electrical_circuits 
    SET panel_id = ?, breaker_position = ?, circuit_label = ?, amperage = ?, wire_gauge = ?, breaker_type = ?, color_code = ?, secondary_position = ?
    WHERE id = ?
  `);
  
  stmt.run(panel_id, breaker_position, circuit_label, amperage, wire_gauge, breaker_type, color_code, secondary_position, id, function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ id: id });
  });
  stmt.finalize();
});

// Delete electrical circuit
app.delete('/electrical-circuits/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM electrical_circuits WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Get electrical symbols/device types
app.get('/electrical/symbols', (req, res) => {
  db.all('SELECT * FROM device_types', [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
      return;
    }
    res.json(rows);
  });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔌 Electrical Panel Mapper Server running on http://0.0.0.0:${PORT}`);
  console.log(`📂 Database: ${dbPath}`);
  console.log(`🌐 Web UI available at http://localhost:${PORT}`);
});