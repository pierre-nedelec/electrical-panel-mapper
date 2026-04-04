#!/usr/bin/env node
/**
 * Revert HVAC and Jacuzzi loads to correct values
 * 
 * - HVAC: Gas furnace with electric fan = 400W (not 3500W)
 * - Jacuzzi: Air jet tub = 1500W (not 7000W heated spa)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

console.log('🔧 Reverting HVAC and Jacuzzi Loads');
console.log('====================================\n');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
    process.exit(1);
  }
  console.log('📂 Database opened\n');
});

// Update device types
db.run(`UPDATE device_types SET default_wattage = 400 WHERE name = 'HVAC Unit'`, function(err) {
  if (err) {
    console.error('❌ Error updating HVAC Unit:', err.message);
  } else {
    console.log(`✅ HVAC Unit: Reverted to 400W (gas furnace fan)`);
  }
});

db.run(`UPDATE device_types SET default_wattage = 1500 WHERE name = 'Jacuzzi'`, function(err) {
  if (err) {
    console.error('❌ Error updating Jacuzzi:', err.message);
  } else {
    console.log(`✅ Jacuzzi: Reverted to 1500W (air jet tub)`);
  }
});

// Update existing entities for 644 Fillmore
db.run(`
  UPDATE entities 
  SET wattage = 400 
  WHERE device_type_id = (SELECT id FROM device_types WHERE name = 'HVAC Unit')
  AND floor_plan_id = 3
`, function(err) {
  if (err) {
    console.error('❌ Error updating HVAC entities:', err.message);
  } else {
    console.log(`✅ Updated ${this.changes} HVAC entity to 400W`);
  }
});

db.run(`
  UPDATE entities 
  SET wattage = 1500 
  WHERE device_type_id = (SELECT id FROM device_types WHERE name = 'Jacuzzi')
  AND floor_plan_id = 3
`, function(err) {
  if (err) {
    console.error('❌ Error updating Jacuzzi entities:', err.message);
  } else {
    console.log(`✅ Updated ${this.changes} Jacuzzi entity to 1500W`);
  }
  
  console.log('\n🎉 Reversion completed successfully!\n');
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    }
    process.exit(0);
  });
});



