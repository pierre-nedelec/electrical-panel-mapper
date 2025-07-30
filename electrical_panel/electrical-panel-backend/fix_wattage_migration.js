#!/usr/bin/env node

/**
 * WATTAGE MIGRATION SCRIPT
 * 
 * This script fixes existing entities in the database that have wattage = 0
 * by updating them with proper default wattage values based on:
 * 1. Device type defaults from device_types table
 * 2. NEC electrical code standards
 * 3. Component type fallbacks
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { getDatabasePath } = require('./src/config');

// NEC Standard electrical loads (backup fallbacks)
const NEC_STANDARD_LOADS = {
  // Device type name → wattage mapping
  'Light': 100,           // Standard LED/CFL fixture
  'Outlet': 180,          // NEC 220.14(I) - 180VA per outlet
  'Switch': 0,            // Switches don't consume power
  'Baseboard Heater': 1500,
  'Ceiling Fan': 150,
  'HVAC Unit': 4000,
  'Heater': 1500,
  'Jacuzzi': 7000,        // More realistic for hot tubs
  'Range/Oven': 8000,
  'Water Heater': 4500,
  'Dishwasher': 1800,
  'Dryer': 5000,
  'Garbage Disposal': 900
};

/**
 * Create a backup before migration
 */
function createBackup(dbPath) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(path.dirname(dbPath), `database_backup_wattage_migration_${timestamp}.db`);
    
    console.log('💾 Creating backup before migration...');
    
    fs.copyFile(dbPath, backupPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`✅ Backup created: ${backupPath}`);
      resolve(backupPath);
    });
  });
}

/**
 * Get all entities that need wattage updates
 */
function getEntitiesNeedingUpdate(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        e.id,
        e.wattage,
        e.device_type_id,
        e.properties,
        dt.name as device_type_name,
        dt.wattage as device_type_wattage,
        dt.category as device_category
      FROM entities e
      LEFT JOIN device_types dt ON e.device_type_id = dt.id
      WHERE e.wattage = 0 OR e.wattage IS NULL
      ORDER BY e.device_type_id, e.id
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
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
        return row;
      });
      
      resolve(entities);
    });
  });
}

/**
 * Calculate correct wattage for an entity
 */
function calculateCorrectWattage(entity) {
  const { device_type_name, device_type_wattage, device_category, properties } = entity;
  
  // 1. First try device type wattage (if > 0)
  if (device_type_wattage && device_type_wattage > 0) {
    console.log(`  Using device type wattage: ${device_type_wattage}W`);
    return device_type_wattage;
  }
  
  // 2. Try NEC standard loads by device name
  if (device_type_name && NEC_STANDARD_LOADS[device_type_name]) {
    const necLoad = NEC_STANDARD_LOADS[device_type_name];
    console.log(`  Using NEC standard for ${device_type_name}: ${necLoad}W`);
    return necLoad;
  }
  
  // 3. Category-based fallbacks
  switch (device_category) {
    case 'lighting':
      console.log(`  Using lighting category default: 100W`);
      return 100;
    case 'receptacle':
      console.log(`  Using receptacle category default: 180W`);
      return 180;
    case 'appliance':
      console.log(`  Using appliance category default: 1500W`);
      return 1500;
    case 'control':
      console.log(`  Using control category default: 0W`);
      return 0;
    default:
      console.log(`  Using final fallback: 100W`);
      return 100;
  }
}

/**
 * Update entities with correct wattage values
 */
function updateEntitiesWattage(db, entities) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Updating ${entities.length} entities...`);
    
    const updatePromises = entities.map(entity => {
      return new Promise((resolveUpdate, rejectUpdate) => {
        const correctWattage = calculateCorrectWattage(entity);
        
        console.log(`\n📝 Entity ${entity.id}:`);
        console.log(`  Device Type: ${entity.device_type_name} (${entity.device_category})`);
        console.log(`  Current Wattage: ${entity.wattage}W`);
        console.log(`  New Wattage: ${correctWattage}W`);
        
        const updateQuery = `UPDATE entities SET wattage = ? WHERE id = ?`;
        
        db.run(updateQuery, [correctWattage, entity.id], function(err) {
          if (err) {
            console.error(`❌ Failed to update entity ${entity.id}:`, err);
            rejectUpdate(err);
            return;
          }
          
          console.log(`✅ Updated entity ${entity.id}: ${entity.wattage}W → ${correctWattage}W`);
          resolveUpdate({
            id: entity.id,
            oldWattage: entity.wattage,
            newWattage: correctWattage,
            deviceType: entity.device_type_name
          });
        });
      });
    });
    
    Promise.all(updatePromises)
      .then(results => {
        console.log(`\n✅ Successfully updated ${results.length} entities`);
        resolve(results);
      })
      .catch(reject);
  });
}

/**
 * Print migration summary
 */
function printSummary(results) {
  console.log(`\n📊 MIGRATION SUMMARY`);
  console.log(`==================`);
  
  const totalWattageAdded = results.reduce((sum, r) => sum + (r.newWattage - r.oldWattage), 0);
  const byDeviceType = {};
  
  results.forEach(r => {
    if (!byDeviceType[r.deviceType]) {
      byDeviceType[r.deviceType] = { count: 0, wattage: 0 };
    }
    byDeviceType[r.deviceType].count++;
    byDeviceType[r.deviceType].wattage += (r.newWattage - r.oldWattage);
  });
  
  console.log(`Total entities updated: ${results.length}`);
  console.log(`Total wattage added: ${totalWattageAdded}W`);
  console.log(`\nBreakdown by device type:`);
  
  Object.entries(byDeviceType).forEach(([deviceType, data]) => {
    console.log(`  ${deviceType}: ${data.count} entities, +${data.wattage}W`);
  });
}

/**
 * Verify migration results
 */
function verifyMigration(db) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        COUNT(*) as total_entities,
        COUNT(CASE WHEN wattage = 0 OR wattage IS NULL THEN 1 END) as zero_wattage,
        SUM(wattage) as total_wattage
      FROM entities
    `;
    
    db.get(query, [], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`\n🔍 VERIFICATION RESULTS`);
      console.log(`======================`);
      console.log(`Total entities: ${row.total_entities}`);
      console.log(`Entities with zero wattage: ${row.zero_wattage}`);
      console.log(`Total system wattage: ${row.total_wattage}W`);
      
      if (row.zero_wattage === 0) {
        console.log(`✅ SUCCESS: All entities now have proper wattage values!`);
      } else {
        console.log(`⚠️ WARNING: ${row.zero_wattage} entities still have zero wattage`);
      }
      
      resolve(row);
    });
  });
}

/**
 * Main migration function
 */
async function runMigration() {
  const dbPath = getDatabasePath();
  
  console.log(`🚀 STARTING WATTAGE MIGRATION`);
  console.log(`============================`);
  console.log(`Database: ${path.resolve(dbPath)}`);
  
  try {
    // 1. Create backup
    const backupPath = await createBackup(dbPath);
    
    // 2. Open database
    const db = new sqlite3.Database(dbPath);
    
    // 3. Get entities needing updates
    console.log(`\n🔍 Finding entities with zero wattage...`);
    const entities = await getEntitiesNeedingUpdate(db);
    
    if (entities.length === 0) {
      console.log(`✅ No entities need wattage updates. Migration complete!`);
      db.close();
      return;
    }
    
    console.log(`Found ${entities.length} entities needing wattage updates:`);
    
    // Group by device type for summary
    const byType = {};
    entities.forEach(e => {
      const typeName = e.device_type_name || 'Unknown';
      byType[typeName] = (byType[typeName] || 0) + 1;
    });
    
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} entities`);
    });
    
    // 4. Update entities
    const results = await updateEntitiesWattage(db, entities);
    
    // 5. Print summary
    printSummary(results);
    
    // 6. Verify results
    await verifyMigration(db);
    
    // 7. Close database
    db.close();
    
    console.log(`\n🎉 MIGRATION COMPLETED SUCCESSFULLY!`);
    console.log(`Backup saved at: ${backupPath}`);
    
  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration }; 