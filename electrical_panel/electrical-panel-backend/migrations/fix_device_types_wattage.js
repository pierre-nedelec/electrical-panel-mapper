#!/usr/bin/env node
/**
 * Database Migration: Fix Device Type Default Wattages
 * 
 * This migration updates device_types table with NEC-compliant default wattage values
 * and adds new heating device types for better load calculation accuracy.
 * 
 * Run: node migrations/fix_device_types_wattage.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🔧 Device Types Wattage Migration');
console.log('================================\n');

/**
 * Create backup of database before migration
 */
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `pre_wattage_fix_${timestamp}.db`);
  
  console.log(`📦 Creating backup: ${backupPath}`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('✅ Backup created\n');
  
  return backupPath;
}

/**
 * Update existing device types with correct default wattages
 */
function updateDeviceTypeWattages(db) {
  return new Promise((resolve, reject) => {
    console.log('📝 Updating existing device type wattages...\n');
    
    const updates = [
      // Core fixes
      { name: 'Light', wattage: 75, voltage: 120, amperage: 15 },
      { name: 'Outlet', wattage: 180, voltage: 120, amperage: 15 }, // NEC 220.14(I)
      { name: 'Jacuzzi', wattage: 7000, voltage: 240, amperage: 30 }, // Typical hot tub
      { name: 'HVAC Unit', wattage: 3500, voltage: 240, amperage: 20 },
      { name: 'Baseboard Heater', wattage: 1500, voltage: 240, amperage: 15 },
      { name: 'Heater', wattage: 1500, voltage: 120, amperage: 15 },
      { name: 'Water Heater', wattage: 4500, voltage: 240, amperage: 30 },
      { name: 'Dishwasher', wattage: 1800, voltage: 120, amperage: 20 },
      { name: 'Range/Oven', wattage: 8000, voltage: 240, amperage: 40 },
      { name: 'Dryer', wattage: 5000, voltage: 240, amperage: 30 },
      { name: 'Garbage Disposal', wattage: 900, voltage: 120, amperage: 15 },
      { name: 'Ceiling Fan', wattage: 150, voltage: 120, amperage: 15 }
    ];
    
    let completed = 0;
    let errors = 0;
    
    updates.forEach(update => {
      db.run(
        `UPDATE device_types 
         SET default_wattage = ?, default_voltage = ?, default_amperage = ?
         WHERE name = ?`,
        [update.wattage, update.voltage, update.amperage, update.name],
        function(err) {
          completed++;
          
          if (err) {
            console.error(`❌ Error updating ${update.name}:`, err.message);
            errors++;
          } else if (this.changes > 0) {
            console.log(`✅ ${update.name}: ${update.wattage}W @ ${update.voltage}V`);
          } else {
            console.log(`⚠️  ${update.name}: not found (will be created)`);
          }
          
          if (completed === updates.length) {
            console.log(`\n✅ Updated ${updates.length - errors} device types\n`);
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Add new heating device types for better granularity
 */
function addHeatingDeviceTypes(db) {
  return new Promise((resolve, reject) => {
    console.log('🆕 Adding new heating device types...\n');
    
    const newTypes = [
      {
        name: 'Infrared Heater (120V)',
        icon: 'LocalFireDepartment',
        category: 'heating',
        wattage: 1500,
        voltage: 120,
        amperage: 15,
        description: 'Portable or fixed infrared heater, 120V'
      },
      {
        name: 'Infrared Heater (240V)',
        icon: 'LocalFireDepartment',
        category: 'heating',
        wattage: 3000,
        voltage: 240,
        amperage: 15,
        description: 'Fixed infrared heater, 240V'
      },
      {
        name: 'Radiant Floor Heating',
        icon: 'Thermostat',
        category: 'heating',
        wattage: 2000,
        voltage: 240,
        amperage: 15,
        description: 'Electric radiant floor heating per room (typical)'
      },
      {
        name: 'Wall Heater',
        icon: 'LocalFireDepartment',
        category: 'heating',
        wattage: 2000,
        voltage: 240,
        amperage: 15,
        description: 'Electric wall-mounted heater'
      },
      {
        name: 'Electric Fireplace',
        icon: 'Fireplace',
        category: 'heating',
        wattage: 1500,
        voltage: 120,
        amperage: 15,
        description: 'Electric fireplace heater'
      },
      {
        name: 'Heat Pump',
        icon: 'Air',
        category: 'hvac',
        wattage: 4000,
        voltage: 240,
        amperage: 20,
        description: 'Heat pump system'
      },
      {
        name: 'Mini Split (Single Head)',
        icon: 'Air',
        category: 'hvac',
        wattage: 1500,
        voltage: 240,
        amperage: 15,
        description: 'Ductless mini-split single head'
      },
      {
        name: 'Mini Split (Multi Head)',
        icon: 'Air',
        category: 'hvac',
        wattage: 3500,
        voltage: 240,
        amperage: 20,
        description: 'Ductless mini-split multi-head system'
      }
    ];
    
    let completed = 0;
    let added = 0;
    let skipped = 0;
    
    newTypes.forEach(type => {
      // Check if exists first
      db.get('SELECT id FROM device_types WHERE name = ?', [type.name], (err, existing) => {
        if (err) {
          console.error(`❌ Error checking ${type.name}:`, err.message);
          completed++;
          if (completed === newTypes.length) resolve();
          return;
        }
        
        if (existing) {
          console.log(`⏭️  ${type.name}: already exists`);
          skipped++;
          completed++;
          if (completed === newTypes.length) {
            console.log(`\n✅ Added ${added} new device types (${skipped} skipped)\n`);
            resolve();
          }
          return;
        }
        
        // Insert new type
        db.run(
          `INSERT INTO device_types 
           (name, icon, category, default_wattage, default_voltage, default_amperage, 
            requires_gfci, requires_afci, fields)
           VALUES (?, ?, ?, ?, ?, ?, 0, 0, '{}')`,
          [type.name, type.icon, type.category, type.wattage, type.voltage, type.amperage],
          function(err) {
            completed++;
            
            if (err) {
              console.error(`❌ Error adding ${type.name}:`, err.message);
            } else {
              console.log(`✅ ${type.name}: ${type.wattage}W @ ${type.voltage}V`);
              added++;
            }
            
            if (completed === newTypes.length) {
              console.log(`\n✅ Added ${added} new device types (${skipped} skipped)\n`);
              resolve();
            }
          }
        );
      });
    });
  });
}

/**
 * Update existing entities with corrected wattages based on device type
 * Only updates entities that have wattage = 0 or match the old incorrect default
 */
function updateEntityWattages(db) {
  return new Promise((resolve, reject) => {
    console.log('🔄 Updating entity wattages to match new defaults...\n');
    
    // Get entities that need updating
    db.all(`
      SELECT e.id, e.wattage, e.device_type_id, dt.name, dt.default_wattage as new_wattage
      FROM entities e
      JOIN device_types dt ON e.device_type_id = dt.id
      WHERE e.wattage != dt.default_wattage
      AND (
        -- Light with old default (10W)
        (dt.name = 'Light' AND e.wattage = 10)
        -- Outlet with 0W
        OR (dt.name = 'Outlet' AND e.wattage = 0)
        -- Jacuzzi with old default (1500W)
        OR (dt.name = 'Jacuzzi' AND e.wattage = 1500)
        -- HVAC with old default (400W)
        OR (dt.name = 'HVAC Unit' AND e.wattage = 400)
      )
    `, [], (err, entities) => {
      if (err) {
        console.error('❌ Error querying entities:', err.message);
        reject(err);
        return;
      }
      
      if (entities.length === 0) {
        console.log('✅ No entities need wattage updates\n');
        resolve();
        return;
      }
      
      console.log(`📊 Found ${entities.length} entities to update:\n`);
      
      // Group by device type for summary
      const byType = entities.reduce((acc, e) => {
        if (!acc[e.name]) acc[e.name] = [];
        acc[e.name].push(e);
        return acc;
      }, {});
      
      Object.entries(byType).forEach(([type, items]) => {
        console.log(`   ${type}: ${items.length} entities (${items[0].wattage}W → ${items[0].new_wattage}W)`);
      });
      console.log('');
      
      let updated = 0;
      entities.forEach(entity => {
        db.run(
          'UPDATE entities SET wattage = ? WHERE id = ?',
          [entity.new_wattage, entity.id],
          function(err) {
            updated++;
            
            if (err) {
              console.error(`❌ Error updating entity ${entity.id}:`, err.message);
            }
            
            if (updated === entities.length) {
              console.log(`✅ Updated ${entities.length} entity wattages\n`);
              resolve();
            }
          }
        );
      });
    });
  });
}

/**
 * Main migration function
 */
async function runMigration() {
  // Create backup first
  const backupPath = createBackup();
  
  // Open database
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Failed to open database:', err.message);
      process.exit(1);
    }
    console.log('📂 Database opened\n');
  });
  
  try {
    // Run migrations in sequence
    await updateDeviceTypeWattages(db);
    await addHeatingDeviceTypes(db);
    await updateEntityWattages(db);
    
    console.log('🎉 Migration completed successfully!');
    console.log(`📦 Backup saved to: ${backupPath}\n`);
    
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      }
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('💾 Database backup available at:', backupPath);
    console.error('   You can restore it if needed\n');
    
    db.close(() => {
      process.exit(1);
    });
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };



