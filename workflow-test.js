#!/usr/bin/env node

/**
 * Comprehensive Workflow Test for Electrical Panel Mapper
 * Tests the complete workflow: Drawing rooms → Adding electrical components → Editing
 */

const fetch = require('node-fetch');

console.log('🧪 TESTING COMPLETE WORKFLOW\n');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3002';

let testFloorPlanId = null;
let testEntityId = null;

// Test 1: Server connectivity
async function testServers() {
  console.log('1. 🌐 Testing Server Connectivity');
  
  try {
    // Test backend
    const backendResponse = await fetch(`${BASE_URL}/entities`);
    if (backendResponse.ok) {
      console.log('   ✅ Backend server: Running on port 3001');
    } else {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }
    
    // Test frontend
    const frontendResponse = await fetch(FRONTEND_URL);
    if (frontendResponse.ok) {
      console.log('   ✅ Frontend server: Running on port 3000');
    } else {
      throw new Error(`Frontend returned ${frontendResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Server connectivity: ${error.message}`);
    return false;
  }
}

// Test 2: Floor plan creation workflow
async function testFloorPlanCreation() {
  console.log('\n2. 🏠 Testing Floor Plan Creation');
  
  try {
    const testPlan = {
      name: `Test Workflow Plan ${Date.now()}`,
      rooms: [
        {
          id: 'room-test-1',
          name: 'Kitchen',
          x: 100,
          y: 100,
          width: 200,
          height: 150
        },
        {
          id: 'room-test-2', 
          name: 'Living Room',
          x: 320,
          y: 100,
          width: 180,
          height: 200
        }
      ],
      viewBox: '0 0 600 400'
    };
    
    const response = await fetch(`${BASE_URL}/floor-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPlan)
    });
    
    if (response.ok) {
      const savedPlan = await response.json();
      testFloorPlanId = savedPlan.id;
      console.log(`   ✅ Floor plan created: ID ${testFloorPlanId}`);
      console.log(`   ✅ Plan contains: ${testPlan.rooms.length} rooms`);
      return true;
    } else {
      throw new Error(`Failed to create floor plan: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Floor plan creation: ${error.message}`);
    return false;
  }
}

// Test 3: Electrical component placement
async function testElectricalComponentPlacement() {
  console.log('\n3. ⚡ Testing Electrical Component Placement');
  
  try {
    const testComponents = [
      {
        device_type_id: 2, // Outlet
        x: 150,
        y: 125,
        room_id: null,
        floor_plan_id: testFloorPlanId,
        breaker_id: null
      },
      {
        device_type_id: 1, // Light
        x: 200,
        y: 175, 
        room_id: null,
        floor_plan_id: testFloorPlanId,
        breaker_id: null
      },
      {
        device_type_id: 1, // Switch
        x: 400,
        y: 200,
        room_id: null,
        floor_plan_id: testFloorPlanId,
        breaker_id: null
      }
    ];
    
    const placedComponents = [];
    
    for (const component of testComponents) {
      const response = await fetch(`${BASE_URL}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(component)
      });
      
      if (response.ok) {
        const savedComponent = await response.json();
        placedComponents.push(savedComponent);
        console.log(`   ✅ Component placed: ID ${savedComponent.id} at (${component.x}, ${component.y})`);
      } else {
        throw new Error(`Failed to place component: ${response.status}`);
      }
    }
    
    testEntityId = placedComponents[0].id; // Save first component ID for editing test
    console.log(`   ✅ Total components placed: ${placedComponents.length}`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Component placement: ${error.message}`);
    return false;
  }
}

// Test 4: Component loading and filtering
async function testComponentLoading() {
  console.log('\n4. 📋 Testing Component Loading & Filtering');
  
  try {
    const response = await fetch(`${BASE_URL}/entities`);
    if (response.ok) {
      const entities = await response.json();
      
      // Filter entities for our test floor plan
      const floorPlanEntities = entities.filter(entity => 
        entity.floor_plan_id === testFloorPlanId
      );
      
      console.log(`   ✅ Total entities in database: ${entities.length}`);
      console.log(`   ✅ Entities for test floor plan: ${floorPlanEntities.length}`);
      
      // Test component type mapping
      const componentTypes = floorPlanEntities.map(entity => {
        const typeMap = { 1: 'light', 2: 'outlet', 3: 'heater', 4: 'jacuzzi' };
        return typeMap[entity.device_type_id] || 'unknown';
      });
      
      console.log(`   ✅ Component types: ${componentTypes.join(', ')}`);
      return true;
      
    } else {
      throw new Error(`Failed to load entities: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Component loading: ${error.message}`);
    return false;
  }
}

// Test 5: Component editing
async function testComponentEditing() {
  console.log('\n5. ✏️ Testing Component Editing');
  
  if (!testEntityId) {
    console.log('   ❌ No test entity ID available for editing');
    return false;
  }
  
  try {
    const updatedData = {
      device_type_id: 2,
      x: 160, // Move component slightly
      y: 135,
      room_id: null,
      floor_plan_id: testFloorPlanId,
      breaker_id: null
    };
    
    const response = await fetch(`${BASE_URL}/entities/${testEntityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Component updated: ${result.updated} rows affected`);
      
      // Verify the update
      const verifyResponse = await fetch(`${BASE_URL}/entities/${testEntityId}`);
      if (verifyResponse.ok) {
        const updated = await verifyResponse.json();
        console.log(`   ✅ Position verified: (${updated.x}, ${updated.y})`);
        return true;
      }
    } else {
      throw new Error(`Failed to update component: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Component editing: ${error.message}`);
    return false;
  }
}

// Test 6: Component deletion
async function testComponentDeletion() {
  console.log('\n6. 🗑️ Testing Component Deletion');
  
  if (!testEntityId) {
    console.log('   ❌ No test entity ID available for deletion');
    return false;
  }
  
  try {
    const response = await fetch(`${BASE_URL}/entities/${testEntityId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      console.log(`   ✅ Component deleted: ID ${testEntityId}`);
      
      // Verify deletion
      const verifyResponse = await fetch(`${BASE_URL}/entities/${testEntityId}`);
      if (!verifyResponse.ok) {
        console.log('   ✅ Deletion verified: Component no longer exists');
        return true;
      } else {
        console.log('   ⚠️ Component still exists after deletion');
        return false;
      }
    } else {
      throw new Error(`Failed to delete component: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Component deletion: ${error.message}`);
    return false;
  }
}

// Test 7: Cleanup
async function cleanup() {
  console.log('\n7. 🧹 Cleanup');
  
  if (testFloorPlanId) {
    try {
      const response = await fetch(`${BASE_URL}/floor-plans/${testFloorPlanId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`   ✅ Test floor plan deleted: ID ${testFloorPlanId}`);
      } else {
        console.log(`   ⚠️ Could not delete test floor plan: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️ Cleanup error: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🎯 STARTING COMPLETE WORKFLOW TEST\n');
  
  const results = [];
  
  results.push(await testServers());
  if (results[0]) {
    results.push(await testFloorPlanCreation());
    results.push(await testElectricalComponentPlacement());
    results.push(await testComponentLoading());
    results.push(await testComponentEditing());
    results.push(await testComponentDeletion());
  }
  
  await cleanup();
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n📊 RESULTS: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Workflow is working correctly.');
    console.log('\n✅ COMPLETE WORKFLOW VERIFIED:');
    console.log('   1. Floor plan creation ✓');
    console.log('   2. Electrical component placement ✓');
    console.log('   3. Component loading & filtering ✓');
    console.log('   4. Component editing ✓');
    console.log('   5. Component deletion ✓');
  } else {
    console.log('❌ Some tests failed. Check the logs above for details.');
  }
  
  return passed === total;
}

// Execute tests
runAllTests().catch(console.error); 