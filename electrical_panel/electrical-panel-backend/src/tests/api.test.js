const request = require('supertest');
const { setupTestApp, teardownTestApp, testData } = require('./setup');

describe('Electrical Panel Mapper API', () => {
  let app;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('System Endpoints', () => {
    test('GET /api/health should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });

    test('GET /api/docs should serve Swagger UI', async () => {
      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
    });

    test('GET /api/docs/json should return OpenAPI spec', async () => {
      const response = await request(app)
        .get('/api/docs/json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toBe('Electrical Panel Mapper API');
    });
  });

  describe('Floor Plans API', () => {
    let floorPlanId;

    test('POST /api/floor-plans should create a new floor plan', async () => {
      const response = await request(app)
        .post('/api/floor-plans')
        .send(testData.floorPlan)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(testData.floorPlan.name);
      floorPlanId = response.body.id;
    });

    test('GET /api/floor-plans should return all floor plans', async () => {
      const response = await request(app)
        .get('/api/floor-plans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
    });

    test('GET /api/floor-plans/:id should return specific floor plan', async () => {
      const response = await request(app)
        .get(`/api/floor-plans/${floorPlanId}`)
        .expect(200);

      expect(response.body.id).toBe(floorPlanId);
      expect(response.body.name).toBe(testData.floorPlan.name);
    });

    test('PUT /api/floor-plans/:id should update floor plan', async () => {
      const updatedData = { ...testData.floorPlan, name: 'Updated Floor Plan' };
      
      const response = await request(app)
        .put(`/api/floor-plans/${floorPlanId}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.name).toBe('Updated Floor Plan');
    });

    test('POST /api/floor-plans should reject duplicate names', async () => {
      await request(app)
        .post('/api/floor-plans')
        .send(testData.floorPlan)
        .expect(400);
    });
  });

  describe('Rooms API', () => {
    let roomId;

    test('POST /api/rooms should create a new room', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send(testData.room)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      roomId = response.body.id;
    });

    test('GET /api/rooms should return all rooms', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('DELETE /api/rooms/:id should delete room', async () => {
      await request(app)
        .delete(`/api/rooms/${roomId}`)
        .expect(200);
    });
  });

  describe('Entities API', () => {
    let entityId;
    let floorPlanId;

    beforeAll(async () => {
      // Create a floor plan first
      const floorPlanResponse = await request(app)
        .post('/api/floor-plans')
        .send({ ...testData.floorPlan, name: 'Test Floor Plan for Entities' });
      floorPlanId = floorPlanResponse.body.id;
    });

    test('POST /api/entities should create a new entity', async () => {
      const entityData = { ...testData.entity, floor_plan_id: floorPlanId };
      
      const response = await request(app)
        .post('/api/entities')
        .send(entityData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      entityId = response.body.id;
    });

    test('GET /api/entities should return all entities', async () => {
      const response = await request(app)
        .get('/api/entities')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/entities/:id should return specific entity', async () => {
      const response = await request(app)
        .get(`/api/entities/${entityId}`)
        .expect(200);

      expect(response.body.id).toBe(entityId);
    });

    test('PUT /api/entities/:id should update entity', async () => {
      const response = await request(app)
        .put(`/api/entities/${entityId}`)
        .send({ x: 150, y: 100 })
        .expect(200);

      expect(response.body.updated).toBeGreaterThan(0);
    });

    test('DELETE /api/entities/:id should delete entity', async () => {
      await request(app)
        .delete(`/api/entities/${entityId}`)
        .expect(200);
    });
  });

  describe('Electrical System API', () => {
    let floorPlanId;
    let panelId;
    let circuitId;

    beforeAll(async () => {
      // Create a floor plan first
      const floorPlanResponse = await request(app)
        .post('/api/floor-plans')
        .send({ ...testData.floorPlan, name: 'Test Floor Plan for Electrical' });
      floorPlanId = floorPlanResponse.body.id;
    });

    test('GET /api/electrical/symbols should return device types', async () => {
      const response = await request(app)
        .get('/api/electrical/symbols')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('icon');
    });

    test('POST /api/electrical/panels should create electrical panel', async () => {
      const panelData = { ...testData.electricalPanel, floor_plan_id: floorPlanId };
      
      const response = await request(app)
        .post('/api/electrical/panels')
        .send(panelData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      panelId = response.body.id;
    });

    test('GET /api/electrical/panels should return electrical panels', async () => {
      const response = await request(app)
        .get('/api/electrical/panels')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('POST /api/electrical/circuits should create electrical circuit', async () => {
      const circuitData = { ...testData.electricalCircuit, panel_id: panelId };
      
      const response = await request(app)
        .post('/api/electrical/circuits')
        .send(circuitData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      circuitId = response.body.id;
    });

    test('GET /api/electrical/circuits should return electrical circuits', async () => {
      const response = await request(app)
        .get('/api/electrical/circuits')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/electrical/components should require floor_plan_id', async () => {
      await request(app)
        .get('/api/electrical/components')
        .expect(400);
    });

    test('GET /api/electrical/components with floor_plan_id should return components', async () => {
      const response = await request(app)
        .get(`/api/electrical/components?floor_plan_id=${floorPlanId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Backup API', () => {
    test('GET /api/backup/list should return backup list', async () => {
      const response = await request(app)
        .get('/api/backup/list')
        .expect(200);

      expect(response.body).toHaveProperty('backups');
      expect(Array.isArray(response.body.backups)).toBe(true);
    });

    test('POST /api/backup/create should handle backup creation', async () => {
      const response = await request(app)
        .post('/api/backup/create')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Legacy Routes', () => {
    test('GET /api/device-types should redirect to /api/electrical/symbols', async () => {
      await request(app)
        .get('/api/device-types')
        .expect(302);
    });

    test('GET /api/breakers should return deprecation notice', async () => {
      const response = await request(app)
        .get('/api/breakers')
        .expect(410);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('deprecated');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/nonexistent should return 404', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });

    test('GET /api/entities/999999 should return 404', async () => {
      await request(app)
        .get('/api/entities/999999')
        .expect(404);
    });

    test('POST /api/entities with invalid data should return 500', async () => {
      await request(app)
        .post('/api/entities')
        .send({ invalid: 'data' })
        .expect(500);
    });
  });
}); 