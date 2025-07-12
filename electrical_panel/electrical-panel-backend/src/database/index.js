const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { getDatabasePath } = require('../config');

/**
 * Database module for the Electrical Panel Mapper backend
 * Handles SQLite initialization, table creation, and default data seeding
 */

let db = null;

/**
 * Initialize the SQLite database
 * @returns {Promise<sqlite3.Database>} Database instance
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath();
    console.log(`📁 Using database at: ${path.resolve(dbPath)}`);

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Connected to SQLite database');
      createTables()
        .then(() => {
          console.log('✅ Database tables initialized');
          resolve(db);
        })
        .catch(reject);
    });
  });
};

/**
 * Create all required database tables
 * @returns {Promise<void>}
 */
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create entities table
      db.run(`
        CREATE TABLE IF NOT EXISTS entities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          x REAL,
          y REAL,
          breaker_id INTEGER,
          room_id INTEGER,
          device_type_id INTEGER,
          floor_plan_id INTEGER,
          circuit_id INTEGER,
          label TEXT,
          voltage INTEGER DEFAULT 120,
          amperage INTEGER DEFAULT 15,
          gfci BOOLEAN DEFAULT 0,
          properties TEXT DEFAULT '{}',
          wattage INTEGER DEFAULT 0,
          FOREIGN KEY (room_id) REFERENCES rooms(id),
          FOREIGN KEY (breaker_id) REFERENCES breakers(id),
          FOREIGN KEY (device_type_id) REFERENCES device_types(id),
          FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id),
          FOREIGN KEY (circuit_id) REFERENCES electrical_circuits(id)
        )
      `);

      // Create breakers table
      db.run(`
        CREATE TABLE IF NOT EXISTS breakers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          position INTEGER,
          amps INTEGER
        )
      `);

      // Create rooms table
      db.run(`
        CREATE TABLE IF NOT EXISTS rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          svg_ref TEXT UNIQUE
        )
      `);

      // Create device_types table
      db.run(`
        CREATE TABLE IF NOT EXISTS device_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          icon TEXT,
          fields TEXT
        )
      `);

      // Create floor_plans table
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

      // Create electrical_panels table
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

      // Create electrical_circuits table
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

      // Create component_circuits table
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
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Seed default data
        seedDefaultData()
          .then(() => resolve())
          .catch(reject);
      });
    });
  });
};

/**
 * Seed default device types
 * @returns {Promise<void>}
 */
const seedDefaultData = () => {
  return new Promise((resolve, reject) => {
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
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('✅ Default device types seeded');
      resolve();
    });
  });
};

/**
 * Get the database instance
 * @returns {sqlite3.Database} Database instance
 */
const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('✅ Database connection closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
}; 