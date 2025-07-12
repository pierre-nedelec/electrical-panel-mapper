const { createApp } = require('../app');
const fs = require('fs');
const path = require('path');

/**
 * Test setup and utilities
 */

// Use a test database
process.env.DATABASE_PATH = ':memory:'; // SQLite in-memory database for tests

let app;

/**
 * Setup test application before all tests
 */
const setupTestApp = async () => {
  if (!app) {
    app = await createApp();
  }
  return app;
};

/**
 * Clean up after tests
 */
const teardownTestApp = async () => {
  // Close database connections if needed
  // For in-memory database, this is handled automatically
};

/**
 * Common test data
 */
const testData = {
  floorPlan: {
    name: 'Test Floor Plan',
    rooms: [
      { id: 'room1', name: 'Living Room', x: 0, y: 0, width: 200, height: 150 },
      { id: 'room2', name: 'Kitchen', x: 200, y: 0, width: 150, height: 100 }
    ],
    viewBox: '0 0 400 300',
    svg: '<svg viewBox="0 0 400 300"><rect x="0" y="0" width="200" height="150" fill="lightblue"/><rect x="200" y="0" width="150" height="100" fill="lightgreen"/></svg>'
  },
  entity: {
    device_type_id: 1,
    x: 100,
    y: 75,
    room_id: 1,
    floor_plan_id: 1,
    label: 'Test Light',
    amperage: 15,
    gfci: false,
    wattage: 60
  },
  room: {
    name: 'Test Room',
    svg_ref: 'test-room-1'
  },
  electricalPanel: {
    floor_plan_id: 1,
    panel_name: 'Main Panel',
    x_position: 50,
    y_position: 50,
    panel_type: 'main',
    main_breaker_amps: 200,
    total_positions: 30
  },
  electricalCircuit: {
    panel_id: 1,
    breaker_position: 1,
    circuit_label: 'Living Room Lights',
    amperage: 15,
    wire_gauge: '12 AWG',
    breaker_type: 'single',
    color_code: '#FF0000'
  }
};

module.exports = {
  setupTestApp,
  teardownTestApp,
  testData
}; 