#!/usr/bin/env node

/**
 * Comprehensive Electrical Component Persistence Testing
 * Tests the complete workflow: place components → save plan → reload plan → verify components
 */

const fs = require('fs');
const path = require('path');

console.log('🔌 ELECTRICAL COMPONENT PERSISTENCE TESTING\n');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test data
const testFloorPlan = {
  name: `Test Plan - Electrical ${Date.now()}`,
  rooms: [
    { id: 'room1', name: 'Kitchen', x: 100, y: 100, width: 200, height: 150 },
    { id: 'room2', name: 'Living Room', x: 320, y: 100, width: 300, height: 200 }
  ],
  viewBox: '0 0 800 600',
  svg: '<rect x="100" y="100" width="200" height="150" fill="none" stroke="black"/><rect x="320" y="100" width="300" height="200" fill="none" stroke="black"/>'
};

const testElectricalComponents = [
  { type: 'outlet', x: 150, y: 125, room_id: 'room1', device_type_id: 1 },
  { type: 'light', x: 200, y: 175, room_id: 'room1', device_type_id: 2 },
  { type: 'switch', x: 120, y: 200, room_id: 'room1', device_type_id: 3 },
  { type: 'outlet', x: 450, y: 150, room_id: 'room2', device_type_id: 1 },
  { type: 'light', x: 500, y: 200, room_id: 'room2', device_type_id: 2 }
];

// Helper functions
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Request failed: ${url}`, error.message);
    throw error;
  }
}

async function checkServerHealth() {
  console.log('1. 🏥 Server Health Check');
  try {
    await makeRequest(`${BACKEND_URL}/floor-plans`);
    console.log('   ✅ Backend server is responding');
    return true;
  } catch (error) {
    console.log('   ❌ Backend server is not responding');
    console.log('   💡 Please start the backend server: cd electrical-panel-backend && npm start');
    return false;
  }
}

async function testFloorPlanCreation() {
  console.log('\n2. 🏠 Floor Plan Creation Test');
  try {
    const createdPlan = await makeRequest(`${BACKEND_URL}/floor-plans`, {
      method: 'POST',
      body: JSON.stringify(testFloorPlan)
    });
    
    console.log(`   ✅ Floor plan created: ID ${createdPlan.id}`);
    console.log(`   📝 Plan name: "${testFloorPlan.name}"`);
    console.log(`   🏠 Rooms: ${testFloorPlan.rooms.length}`);
    
    return createdPlan;
  } catch (error) {
    console.log('   ❌ Failed to create floor plan:', error.message);
    throw error;
  }
}

async function testElectricalComponentPlacement(floorPlanId) {
  console.log('\n3. ⚡ Electrical Component Placement Test');
  const placedComponents = [];
  
  for (let i = 0; i < testElectricalComponents.length; i++) {
    const component = testElectricalComponents[i];
    try {
      console.log(`   📍 Placing ${component.type} at (${component.x}, ${component.y})`);
      
      const placedComponent = await makeRequest(
        `${BACKEND_URL}/floor-plans/${floorPlanId}/electrical/components`, 
        {
          method: 'POST',
          body: JSON.stringify(component)
        }
      );
      
      placedComponents.push({ ...component, id: placedComponent.id });
      console.log(`   ✅ ${component.type} placed successfully (ID: ${placedComponent.id})`);
      
    } catch (error) {
      console.log(`   ❌ Failed to place ${component.type}:`, error.message);
      throw error;
    }
  }
  
  console.log(`   🎯 Total components placed: ${placedComponents.length}`);
  return placedComponents;
}

async function testElectricalDataRetrieval(floorPlanId, expectedCount) {
  console.log('\n4. 📊 Electrical Data Retrieval Test');
  try {
    const electricalData = await makeRequest(`${BACKEND_URL}/floor-plans/${floorPlanId}/electrical`);
    
    console.log(`   📦 Retrieved electrical data for floor plan ${floorPlanId}`);
    console.log(`   ⚡ Components found: ${electricalData.components ? electricalData.components.length : 0}`);
    console.log(`   📋 Panels found: ${electricalData.panels ? electricalData.panels.length : 0}`);
    console.log(`   🔌 Circuits found: ${electricalData.circuits ? electricalData.circuits.length : 0}`);
    
    // Validate component count
    const actualCount = electricalData.components ? electricalData.components.length : 0;
    if (actualCount === expectedCount) {
      console.log(`   ✅ Component count matches: ${actualCount}/${expectedCount}`);
    } else {
      console.log(`   ❌ Component count mismatch: ${actualCount}/${expectedCount}`);
      throw new Error(`Expected ${expectedCount} components, got ${actualCount}`);
    }
    
    return electricalData;
  } catch (error) {
    console.log('   ❌ Failed to retrieve electrical data:', error.message);
    throw error;
  }
}

async function testFloorPlanReload(floorPlanId) {
  console.log('\n5. 🔄 Floor Plan Reload Test');
  try {
    const reloadedPlan = await makeRequest(`${BACKEND_URL}/floor-plans/${floorPlanId}`);
    
    console.log(`   ✅ Floor plan reloaded: "${reloadedPlan.name}"`);
    console.log(`   🏠 Rooms in reloaded plan: ${reloadedPlan.rooms ? reloadedPlan.rooms.length : 0}`);
    
    return reloadedPlan;
  } catch (error) {
    console.log('   ❌ Failed to reload floor plan:', error.message);
    throw error;
  }
}

async function testPersistenceWorkflow() {
  console.log('\n6. 🔄 Complete Persistence Workflow Test');
  console.log('   Testing: Place components → Save → Reload → Verify persistence');
  
  try {
    // Step 1: Create floor plan
    const createdPlan = await testFloorPlanCreation();
    
    // Step 2: Place electrical components
    const placedComponents = await testElectricalComponentPlacement(createdPlan.id);
    
    // Step 3: Verify components are saved
    const electricalData1 = await testElectricalDataRetrieval(createdPlan.id, placedComponents.length);
    
    // Step 4: Reload floor plan
    const reloadedPlan = await testFloorPlanReload(createdPlan.id);
    
    // Step 5: Verify components persist after reload
    const electricalData2 = await testElectricalDataRetrieval(createdPlan.id, placedComponents.length);
    
    // Step 6: Validate component data integrity
    console.log('\n   🔍 Data Integrity Validation:');
    const retrievedComponents = electricalData2.components || [];
    
    for (const originalComponent of placedComponents) {
      const retrieved = retrievedComponents.find(c => c.id === originalComponent.id);
      if (retrieved) {
        const matches = (
          retrieved.type === originalComponent.type &&
          retrieved.x === originalComponent.x &&
          retrieved.y === originalComponent.y
        );
        if (matches) {
          console.log(`   ✅ ${originalComponent.type} data integrity verified`);
        } else {
          console.log(`   ❌ ${originalComponent.type} data integrity failed`);
          console.log(`      Expected: ${JSON.stringify(originalComponent)}`);
          console.log(`      Retrieved: ${JSON.stringify(retrieved)}`);
        }
      } else {
        console.log(`   ❌ ${originalComponent.type} not found in retrieved data`);
      }
    }
    
    // Cleanup: Delete test floor plan
    await makeRequest(`${BACKEND_URL}/floor-plans/${createdPlan.id}`, { method: 'DELETE' });
    console.log(`   🧹 Test floor plan deleted (cleanup)`);
    
    return true;
    
  } catch (error) {
    console.log(`   ❌ Persistence workflow failed: ${error.message}`);
    return false;
  }
}

async function analyzeDatabaseSchema() {
  console.log('\n7. 🗄️ Database Schema Analysis');
  
  // Check if backend files exist
  const backendPath = path.join(__dirname, '../../../electrical-panel-backend');
  const indexPath = path.join(backendPath, 'index.js');
  
  if (fs.existsSync(indexPath)) {
    const backendCode = fs.readFileSync(indexPath, 'utf8');
    
    // Analyze schema
    const hasEntitiesTable = backendCode.includes('CREATE TABLE IF NOT EXISTS entities');
    const hasFloorPlanId = backendCode.includes('floor_plan_id');
    const hasElectricalEndpoint = backendCode.includes('/electrical/components');
    
    console.log(`   📋 entities table exists: ${hasEntitiesTable ? '✅' : '❌'}`);
    console.log(`   🔗 floor_plan_id column exists: ${hasFloorPlanId ? '✅' : '❌'}`);
    console.log(`   🔌 electrical components endpoint: ${hasElectricalEndpoint ? '✅' : '❌'}`);
    
    // Check for potential issues
    if (backendCode.includes('INSERT INTO entities') && !backendCode.includes('floor_plan_id')) {
      console.log('   ⚠️  Potential issue: INSERT statement might not include floor_plan_id');
    }
    
  } else {
    console.log('   ❌ Backend file not found');
  }
}

async function runComprehensiveTests() {
  console.log('🚀 STARTING COMPREHENSIVE ELECTRICAL PERSISTENCE TESTS\n');
  
  const startTime = Date.now();
  
  try {
    // Health check
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
      process.exit(1);
    }
    
    // Schema analysis
    await analyzeDatabaseSchema();
    
    // Main persistence workflow test
    const workflowSuccess = await testPersistenceWorkflow();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Test duration: ${duration} seconds`);
    console.log(`🎯 Workflow success: ${workflowSuccess ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (workflowSuccess) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Electrical components are properly persisting');
      console.log('✅ Save/reload workflow is working correctly');
    } else {
      console.log('\n❌ TESTS FAILED!');
      console.log('🔧 Issues found with electrical component persistence');
      console.log('💡 Check the error messages above for details');
    }
    
  } catch (error) {
    console.error('\n💥 Critical test failure:', error.message);
    process.exit(1);
  }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run tests
runComprehensiveTests().catch(console.error);
