const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { getDatabasePath } = require('../config');

/**
 * Database module for the Electrical Panel Mapper backend
 * Handles SQLite initialization, table creation, and default data seeding
 */

let db = null;

/**
 * Create a backup of the database before any operations
 * @returns {Promise<string>} Backup file path
 */
const createMigrationBackup = () => {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath();
    
    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.log('📝 No existing database found, skipping backup');
      resolve(null);
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(path.dirname(dbPath), `database_backup_startup_${timestamp}.db`);
    
    console.log('💾 Creating startup backup...');
    
    fs.copyFile(dbPath, backupPath, (err) => {
      if (err) {
        console.error('❌ Failed to create backup:', err);
        reject(err);
        return;
      }
      
      console.log(`✅ Startup backup created: ${backupPath}`);
      resolve(backupPath);
    });
  });
};

/**
 * Initialize the SQLite database
 * @returns {Promise<sqlite3.Database>} Database instance
 */
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const dbPath = getDatabasePath();
    console.log(`📁 Using database at: ${path.resolve(dbPath)}`);

    // Create backup before any operations
    createMigrationBackup()
      .then((backupPath) => {
        if (backupPath) {
          console.log(`🛡️ Database backup created at: ${backupPath}`);
        }
        
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
      })
      .catch(reject);
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

      // Create device_types table (with new schema)
      db.run(`
        CREATE TABLE IF NOT EXISTS device_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT,
          fields TEXT DEFAULT '{}',
          is_custom BOOLEAN DEFAULT 0,
          created_by_user BOOLEAN DEFAULT 0,
          category TEXT DEFAULT 'general',
          default_wattage INTEGER DEFAULT 0,
          default_voltage INTEGER DEFAULT 120,
          default_amperage INTEGER DEFAULT 15,
          requires_gfci BOOLEAN DEFAULT 0,
          requires_afci BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      `);

      // Create project_templates table for professional features
      db.run(`
        CREATE TABLE IF NOT EXISTS project_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          template_type TEXT NOT NULL DEFAULT 'residential',
          floor_plan_template TEXT,
          device_types_config TEXT DEFAULT '{}',
          circuit_config TEXT DEFAULT '{}',
          panel_config TEXT DEFAULT '{}',
          code_requirements TEXT DEFAULT '{}',
          is_system_template BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create code_violations table for compliance tracking
      db.run(`
        CREATE TABLE IF NOT EXISTS code_violations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          floor_plan_id INTEGER NOT NULL,
          entity_id INTEGER,
          violation_type TEXT NOT NULL,
          violation_code TEXT,
          description TEXT NOT NULL,
          severity TEXT DEFAULT 'warning',
          resolved BOOLEAN DEFAULT 0,
          resolved_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE CASCADE,
          FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
        )
      `);

      // Create materials_list table for cost estimation
      db.run(`
        CREATE TABLE IF NOT EXISTS materials_list (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          floor_plan_id INTEGER NOT NULL,
          material_type TEXT NOT NULL,
          description TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          unit TEXT DEFAULT 'each',
          unit_cost DECIMAL(10,2) DEFAULT 0.00,
          total_cost DECIMAL(10,2) DEFAULT 0.00,
          supplier TEXT,
          part_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (floor_plan_id) REFERENCES floor_plans(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Check if we need to seed default data (only for new databases)
        checkAndSeedDefaultData()
          .then(() => resolve())
          .catch(reject);
      });
    });
  });
};

/**
 * Check if database needs seeding and seed if empty
 * @returns {Promise<void>}
 */
const checkAndSeedDefaultData = () => {
  return new Promise((resolve, reject) => {
    // Check if device_types table has data
    db.get("SELECT COUNT(*) as count FROM device_types", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row.count === 0) {
        console.log('🌱 Seeding default data for new database...');
        seedDefaultData()
          .then(() => resolve())
          .catch(reject);
      } else {
        console.log('✅ Database already has data, skipping seeding');
        resolve();
      }
    });
  });
};

/**
 * Seed project templates
 * @returns {Promise<void>}
 */
const seedProjectTemplates = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT OR IGNORE INTO project_templates (name, description, template_type, code_requirements, is_system_template) VALUES
        ('Residential - Single Family', 'Standard single family home electrical layout', 'residential', '{"min_outlets_per_room": 2, "gfci_required": ["bathroom", "kitchen", "outdoor"], "afci_required": ["bedroom", "living"]}', 1),
        ('Residential - Apartment', 'Multi-unit residential electrical layout', 'residential', '{"min_outlets_per_room": 2, "gfci_required": ["bathroom", "kitchen"], "afci_required": ["bedroom", "living"]}', 1),
        ('Commercial - Office', 'Commercial office space electrical layout', 'commercial', '{"min_outlets_per_room": 4, "emergency_lighting": true, "exit_signs": true}', 1),
        ('Commercial - Retail', 'Retail space electrical layout', 'commercial', '{"min_outlets_per_room": 6, "display_lighting": true, "security_systems": true}', 1),
        ('Industrial - Light Manufacturing', 'Light manufacturing facility layout', 'industrial', '{"three_phase_required": true, "machinery_circuits": true, "emergency_systems": true}', 1)
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('✅ Project templates seeded');
      resolve();
    });
  });
};

/**
 * Seed default device types (only for new databases)
 * @returns {Promise<void>}
 */
const seedDefaultData = () => {
  return new Promise((resolve, reject) => {
    // Insert default device types if they don't exist
    db.run(`
      INSERT OR IGNORE INTO device_types (name, icon, category, default_wattage, default_voltage, default_amperage, requires_gfci, requires_afci) VALUES
        ('Light', 'Lightbulb', 'lighting', 60, 120, 15, 0, 1),
        ('Outlet', 'Outlet', 'receptacle', 0, 120, 15, 0, 1),
        ('Switch', 'ToggleOn', 'control', 0, 120, 15, 0, 1),
        ('Heater', 'LocalFireDepartment', 'heating', 1500, 120, 15, 0, 0),
        ('Baseboard Heater', 'Thermostat', 'heating', 1000, 240, 15, 0, 0),
        ('Jacuzzi', 'HotTub', 'appliance', 1500, 240, 20, 1, 0),
        ('Water Heater', 'Water', 'appliance', 4500, 240, 30, 0, 0),
        ('HVAC Unit', 'Air', 'hvac', 3000, 240, 20, 0, 0),
        ('Dryer', 'LocalLaundryService', 'appliance', 5000, 240, 30, 0, 0),
        ('Range/Oven', 'Kitchen', 'appliance', 8000, 240, 40, 0, 0),
        ('Dishwasher', 'Kitchen', 'appliance', 1800, 120, 20, 1, 0),
        ('Garbage Disposal', 'Delete', 'appliance', 500, 120, 15, 1, 0),
        ('Ceiling Fan', 'Air', 'lighting', 75, 120, 15, 0, 1),
        ('GFCI Outlet', 'Outlet', 'receptacle', 0, 120, 15, 1, 1),
        ('USB Outlet', 'Outlet', 'receptacle', 0, 120, 15, 0, 1),
        ('Arc Fault Outlet', 'Outlet', 'receptacle', 0, 120, 15, 0, 1),
        ('Smoke Detector', 'Smoke', 'safety', 10, 120, 15, 0, 1),
        ('Carbon Monoxide Detector', 'Warning', 'safety', 10, 120, 15, 0, 1),
        ('Doorbell', 'Doorbell', 'control', 15, 24, 1, 0, 0),
        ('Security Camera', 'Camera', 'security', 12, 12, 1, 0, 0)
    `, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('✅ Default device types seeded');
      
      // Seed project templates
      seedProjectTemplates()
        .then(() => resolve())
        .catch(reject);
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