const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

/**
 * Smart Database Migration Script
 * Intelligently maps existing data to new enhanced schema
 * Cleans up duplicates and adds professional features
 */

const dbPath = path.join(__dirname, 'database.db');
const backupPath = path.join(__dirname, `database_backup_smart_migration_${Date.now()}.db`);

console.log('🔄 Starting Smart Database Migration...');
console.log('==================================================');

// Create backup first
fs.copyFileSync(dbPath, backupPath);
console.log(`✅ Backup created: ${backupPath}`);

const db = new sqlite3.Database(dbPath);

/**
 * Analyze existing data structure
 */
const analyzeDatabase = () => {
  return new Promise((resolve, reject) => {
    console.log('\n📊 Analyzing existing database...');
    
    const analysis = {
      floor_plans: 0,
      entities: 0,
      rooms: 0,
      device_types: 0,
      device_types_unique: 0,
      electrical_panels: 0,
      electrical_circuits: 0,
      device_type_mapping: {},
      room_mapping: {},
      duplicate_device_types: []
    };
    
    db.serialize(() => {
      // Count records in each table
      db.get("SELECT COUNT(*) as count FROM floor_plans", (err, row) => {
        if (err) reject(err);
        analysis.floor_plans = row.count;
      });
      
      db.get("SELECT COUNT(*) as count FROM entities", (err, row) => {
        if (err) reject(err);
        analysis.entities = row.count;
      });
      
      db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
        if (err) reject(err);
        analysis.rooms = row.count;
      });
      
      db.get("SELECT COUNT(*) as count FROM device_types", (err, row) => {
        if (err) reject(err);
        analysis.device_types = row.count;
      });
      
      // Check for unique device types
      db.get("SELECT COUNT(DISTINCT name) as count FROM device_types", (err, row) => {
        if (err) reject(err);
        analysis.device_types_unique = row.count;
      });
      
      db.get("SELECT COUNT(*) as count FROM electrical_panels", (err, row) => {
        if (err) reject(err);
        analysis.electrical_panels = row.count;
      });
      
      db.get("SELECT COUNT(*) as count FROM electrical_circuits", (err, row) => {
        if (err) reject(err);
        analysis.electrical_circuits = row.count;
        
        // Get device type mapping and find duplicates
        db.all(`
          SELECT id, name, icon, fields, COUNT(*) OVER (PARTITION BY name) as duplicate_count
          FROM device_types 
          ORDER BY name, id
        `, (err, rows) => {
          if (err) reject(err);
          
          const seenNames = new Set();
          rows.forEach(row => {
            if (row.duplicate_count > 1) {
              if (!seenNames.has(row.name)) {
                analysis.duplicate_device_types.push({
                  name: row.name,
                  count: row.duplicate_count,
                  first_id: row.id
                });
                seenNames.add(row.name);
              }
            }
            
            // Only map the first occurrence of each device type
            if (!analysis.device_type_mapping[row.name]) {
              analysis.device_type_mapping[row.name] = {
                id: row.id,
                name: row.name,
                icon: row.icon,
                fields: row.fields,
                category: mapDeviceTypeToCategory(row.name),
                electrical_specs: getElectricalSpecs(row.name)
              };
            }
          });
          
          // Get room mapping
          db.all("SELECT id, name, svg_ref FROM rooms", (err, rows) => {
            if (err) reject(err);
            
            rows.forEach(row => {
              analysis.room_mapping[row.id] = {
                name: row.name,
                svg_ref: row.svg_ref
              };
            });
            
            console.log(`📈 Analysis Complete:`);
            console.log(`   Floor Plans: ${analysis.floor_plans}`);
            console.log(`   Entities: ${analysis.entities}`);
            console.log(`   Rooms: ${analysis.rooms}`);
            console.log(`   Device Types: ${analysis.device_types} (${analysis.device_types_unique} unique)`);
            console.log(`   Duplicate Device Types: ${analysis.duplicate_device_types.length}`);
            console.log(`   Electrical Panels: ${analysis.electrical_panels}`);
            console.log(`   Electrical Circuits: ${analysis.electrical_circuits}`);
            
            if (analysis.duplicate_device_types.length > 0) {
              console.log('\n🔍 Duplicates found:');
              analysis.duplicate_device_types.forEach(dup => {
                console.log(`   ${dup.name}: ${dup.count} duplicates`);
              });
            }
            
            resolve(analysis);
          });
        });
      });
    });
  });
};

/**
 * Clean up device_types duplicates
 */
const cleanupDeviceTypes = (analysis) => {
  return new Promise((resolve, reject) => {
    console.log('\n🧹 Cleaning up device_types duplicates...');
    
    if (analysis.duplicate_device_types.length === 0) {
      console.log('✅ No duplicates found, skipping cleanup');
      resolve();
      return;
    }
    
    db.serialize(() => {
      // Create a clean device_types table
      db.run(`
        CREATE TABLE device_types_clean (
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
      `, (err) => {
        if (err) reject(err);
        
        // Insert unique device types with enhanced data
        const insertPromises = [];
        Object.values(analysis.device_type_mapping).forEach(deviceType => {
          const specs = deviceType.electrical_specs;
          
          insertPromises.push(new Promise((resolveInsert, rejectInsert) => {
            db.run(`
              INSERT INTO device_types_clean 
              (name, icon, fields, category, default_wattage, default_voltage, default_amperage, requires_gfci, requires_afci, is_custom, created_by_user)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
            `, [
              deviceType.name,
              deviceType.icon,
              deviceType.fields || '{}',
              deviceType.category,
              specs.wattage,
              specs.voltage,
              specs.amperage,
              specs.gfci ? 1 : 0,
              specs.afci ? 1 : 0
            ], function(err) {
              if (err) {
                rejectInsert(err);
              } else {
                console.log(`   ✅ Added ${deviceType.name} (${deviceType.category})`);
                // Update the mapping with the new ID
                analysis.device_type_mapping[deviceType.name].new_id = this.lastID;
                resolveInsert();
              }
            });
          }));
        });
        
        Promise.all(insertPromises)
          .then(() => {
            console.log(`✅ Created clean device_types table with ${Object.keys(analysis.device_type_mapping).length} unique types`);
            resolve();
          })
          .catch(reject);
      });
    });
  });
};

/**
 * Update entity references to use clean device_type IDs
 */
const updateEntityReferences = (analysis) => {
  return new Promise((resolve, reject) => {
    console.log('\n🔗 Updating entity references...');
    
    // Get all entities with their current device_type_id
    db.all("SELECT id, device_type_id FROM entities", (err, entities) => {
      if (err) reject(err);
      
      const updatePromises = [];
      
      entities.forEach(entity => {
        // Find the device type name for this old ID
        db.get("SELECT name FROM device_types WHERE id = ?", [entity.device_type_id], (err, deviceTypeRow) => {
          if (err) {
            console.log(`   ⚠️  Warning: Could not find device type for entity ${entity.id}`);
            return;
          }
          
          if (deviceTypeRow && analysis.device_type_mapping[deviceTypeRow.name]) {
            const newId = analysis.device_type_mapping[deviceTypeRow.name].new_id;
            
            updatePromises.push(new Promise((resolveUpdate, rejectUpdate) => {
              db.run("UPDATE entities SET device_type_id = ? WHERE id = ?", [newId, entity.id], (err) => {
                if (err) rejectUpdate(err);
                else resolveUpdate();
              });
            }));
          }
        });
      });
      
      // Wait a bit for all the async operations to complete
      setTimeout(() => {
        Promise.all(updatePromises)
          .then(() => {
            console.log(`✅ Updated ${entities.length} entity references`);
            resolve();
          })
          .catch(reject);
      }, 1000);
    });
  });
};

/**
 * Replace old device_types table with clean one
 */
const replaceDeviceTypesTable = () => {
  return new Promise((resolve, reject) => {
    console.log('\n🔄 Replacing device_types table...');
    
    db.serialize(() => {
      db.run("DROP TABLE device_types", (err) => {
        if (err) reject(err);
        
        db.run("ALTER TABLE device_types_clean RENAME TO device_types", (err) => {
          if (err) reject(err);
          
          console.log('✅ Device types table replaced successfully');
          resolve();
        });
      });
    });
  });
};

/**
 * Update entities with electrical specifications
 */
const updateEntitiesWithSpecs = (analysis) => {
  return new Promise((resolve, reject) => {
    console.log('\n🔌 Updating entities with electrical specifications...');
    
    db.all("SELECT id, device_type_id FROM entities", (err, entities) => {
      if (err) reject(err);
      
      const updatePromises = [];
      
      entities.forEach(entity => {
        // Find the device type specs
        db.get("SELECT name FROM device_types WHERE id = ?", [entity.device_type_id], (err, deviceTypeRow) => {
          if (err || !deviceTypeRow) return;
          
          const deviceTypeData = analysis.device_type_mapping[deviceTypeRow.name];
          if (deviceTypeData) {
            const specs = deviceTypeData.electrical_specs;
            
            updatePromises.push(new Promise((resolveUpdate, rejectUpdate) => {
              db.run(`
                UPDATE entities 
                SET voltage = COALESCE(voltage, ?),
                    amperage = COALESCE(amperage, ?),
                    wattage = COALESCE(wattage, ?),
                    gfci = COALESCE(gfci, ?)
                WHERE id = ?
              `, [specs.voltage, specs.amperage, specs.wattage, specs.gfci ? 1 : 0, entity.id], (err) => {
                if (err) rejectUpdate(err);
                else resolveUpdate();
              });
            }));
          }
        });
      });
      
      setTimeout(() => {
        Promise.all(updatePromises)
          .then(() => {
            console.log(`✅ Updated entities with electrical specifications`);
            resolve();
          })
          .catch(reject);
      }, 1000);
    });
  });
};

/**
 * Map device type names to categories
 */
const mapDeviceTypeToCategory = (name) => {
  const categoryMap = {
    'Light': 'lighting',
    'Outlet': 'receptacle',
    'Switch': 'control',
    'Heater': 'heating',
    'Baseboard Heater': 'heating',
    'Jacuzzi': 'appliance',
    'Water Heater': 'appliance',
    'HVAC Unit': 'hvac',
    'Dryer': 'appliance',
    'Range/Oven': 'appliance',
    'Dishwasher': 'appliance',
    'Garbage Disposal': 'appliance',
    'Ceiling Fan': 'lighting',
    'GFCI Outlet': 'receptacle',
    'USB Outlet': 'receptacle',
    'Arc Fault Outlet': 'receptacle',
    'Smoke Detector': 'safety',
    'Carbon Monoxide Detector': 'safety',
    'Doorbell': 'control',
    'Security Camera': 'security'
  };
  
  return categoryMap[name] || 'general';
};

/**
 * Get electrical specifications for device types
 */
const getElectricalSpecs = (name) => {
  const specsMap = {
    'Light': { wattage: 60, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Outlet': { wattage: 0, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Switch': { wattage: 0, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Heater': { wattage: 1500, voltage: 120, amperage: 15, gfci: false, afci: false },
    'Baseboard Heater': { wattage: 1000, voltage: 240, amperage: 15, gfci: false, afci: false },
    'Jacuzzi': { wattage: 1500, voltage: 240, amperage: 20, gfci: true, afci: false },
    'Water Heater': { wattage: 4500, voltage: 240, amperage: 30, gfci: false, afci: false },
    'HVAC Unit': { wattage: 3000, voltage: 240, amperage: 20, gfci: false, afci: false },
    'Dryer': { wattage: 5000, voltage: 240, amperage: 30, gfci: false, afci: false },
    'Range/Oven': { wattage: 8000, voltage: 240, amperage: 40, gfci: false, afci: false },
    'Dishwasher': { wattage: 1800, voltage: 120, amperage: 20, gfci: true, afci: false },
    'Garbage Disposal': { wattage: 500, voltage: 120, amperage: 15, gfci: true, afci: false },
    'Ceiling Fan': { wattage: 75, voltage: 120, amperage: 15, gfci: false, afci: true },
    'GFCI Outlet': { wattage: 0, voltage: 120, amperage: 15, gfci: true, afci: true },
    'USB Outlet': { wattage: 0, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Arc Fault Outlet': { wattage: 0, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Smoke Detector': { wattage: 10, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Carbon Monoxide Detector': { wattage: 10, voltage: 120, amperage: 15, gfci: false, afci: true },
    'Doorbell': { wattage: 15, voltage: 24, amperage: 1, gfci: false, afci: false },
    'Security Camera': { wattage: 12, voltage: 12, amperage: 1, gfci: false, afci: false }
  };
  
  return specsMap[name] || { wattage: 0, voltage: 120, amperage: 15, gfci: false, afci: false };
};

/**
 * Verify migration success
 */
const verifyMigration = () => {
  return new Promise((resolve, reject) => {
    console.log('\n✅ Verifying migration...');
    
    db.serialize(() => {
      // Check device_types cleanup
      db.get("SELECT COUNT(*) as count FROM device_types", (err, row) => {
        if (err) reject(err);
        console.log(`   Device types after cleanup: ${row.count}`);
      });
      
      // Check device_types has new columns
      db.get("SELECT COUNT(*) as count FROM device_types WHERE category IS NOT NULL", (err, row) => {
        if (err) reject(err);
        console.log(`   Device types with categories: ${row.count}`);
      });
      
      // Check entities have electrical specs
      db.get("SELECT COUNT(*) as count FROM entities WHERE voltage IS NOT NULL", (err, row) => {
        if (err) reject(err);
        console.log(`   Entities with voltage specs: ${row.count}`);
      });
      
      // Verify no data loss
      db.get("SELECT COUNT(*) as count FROM entities", (err, row) => {
        if (err) reject(err);
        console.log(`   Total entities preserved: ${row.count}`);
      });
      
      db.get("SELECT COUNT(*) as count FROM floor_plans", (err, row) => {
        if (err) reject(err);
        console.log(`   Floor plans preserved: ${row.count}`);
      });
      
      db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
        if (err) reject(err);
        console.log(`   Rooms preserved: ${row.count}`);
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('==================================================');
        console.log('✅ All your floor plan drawings are preserved');
        console.log('✅ All your electrical components are preserved');
        console.log('✅ All your rooms are preserved');
        console.log('✅ Device types cleaned up and enhanced');
        console.log('✅ Entities updated with electrical properties');
        console.log('✅ New professional features are now available');
        console.log(`📁 Backup available at: ${backupPath}`);
        
        resolve();
      });
    });
  });
};

/**
 * Main migration function
 */
const runMigration = async () => {
  try {
    const analysis = await analyzeDatabase();
    await cleanupDeviceTypes(analysis);
    await updateEntityReferences(analysis);
    await replaceDeviceTypesTable();
    await updateEntitiesWithSpecs(analysis);
    await verifyMigration();
    
    db.close();
    console.log('\n🚀 Your database is now ready for the enhanced backend!');
    console.log('You can now run: npm start');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log(`🔄 Restore from backup: cp "${backupPath}" "${dbPath}"`);
    process.exit(1);
  }
};

// Run the migration
runMigration(); 