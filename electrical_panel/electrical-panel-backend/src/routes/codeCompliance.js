const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CodeViolation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Violation ID
 *         floor_plan_id:
 *           type: integer
 *           description: Floor plan ID
 *         entity_id:
 *           type: integer
 *           description: Associated entity ID (if applicable)
 *         violation_type:
 *           type: string
 *           description: Type of violation
 *         violation_code:
 *           type: string
 *           description: NEC code reference
 *         description:
 *           type: string
 *           description: Violation description
 *         severity:
 *           type: string
 *           enum: [critical, warning, info]
 *           description: Violation severity
 *         resolved:
 *           type: boolean
 *           description: Whether violation has been resolved
 *         resolved_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *     ComplianceReport:
 *       type: object
 *       properties:
 *         floor_plan_id:
 *           type: integer
 *         total_violations:
 *           type: integer
 *         critical_violations:
 *           type: integer
 *         warning_violations:
 *           type: integer
 *         info_violations:
 *           type: integer
 *         compliance_score:
 *           type: number
 *           description: Compliance score (0-100)
 *         violations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CodeViolation'
 */

/**
 * @swagger
 * /code-compliance/check/{floor_plan_id}:
 *   post:
 *     summary: Run code compliance check on a floor plan
 *     tags: [Code Compliance]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compliance check results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ComplianceReport'
 */
router.post('/check/:floor_plan_id', async (req, res) => {
  const db = getDatabase();
  const floorPlanId = req.params.floor_plan_id;
  
  try {
    // Clear existing violations for this floor plan
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM code_violations WHERE floor_plan_id = ?', [floorPlanId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Get floor plan and rooms
    const floorPlan = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM floor_plans WHERE id = ?', [floorPlanId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!floorPlan) {
      res.status(404).json({ error: 'Floor plan not found' });
      return;
    }
    
    const rooms = JSON.parse(floorPlan.rooms_data || '[]');
    
    // Get all entities for this floor plan
    const entities = await new Promise((resolve, reject) => {
      db.all(`
        SELECT e.*, dt.name as device_type, dt.category, dt.requires_gfci, dt.requires_afci
        FROM entities e
        LEFT JOIN device_types dt ON e.device_type_id = dt.id
        WHERE e.floor_plan_id = ?
      `, [floorPlanId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const violations = [];
    
    // Check GFCI requirements
    violations.push(...await checkGFCIRequirements(db, floorPlanId, entities, rooms));
    
    // Check AFCI requirements
    violations.push(...await checkAFCIRequirements(db, floorPlanId, entities, rooms));
    
    // Check outlet spacing
    violations.push(...await checkOutletSpacing(db, floorPlanId, entities, rooms));
    
    // Check load calculations
    violations.push(...await checkLoadViolations(db, floorPlanId, entities));
    
    // Check wire gauge vs breaker compatibility
    violations.push(...await checkWireGaugeViolations(db, floorPlanId, entities));
    
    // Insert violations into database
    for (const violation of violations) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO code_violations (floor_plan_id, entity_id, violation_type, violation_code, description, severity)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          violation.floor_plan_id,
          violation.entity_id,
          violation.violation_type,
          violation.violation_code,
          violation.description,
          violation.severity
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Calculate compliance score
    const totalViolations = violations.length;
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const warningViolations = violations.filter(v => v.severity === 'warning').length;
    const infoViolations = violations.filter(v => v.severity === 'info').length;
    
    // Simple scoring: 100 - (critical*10 + warning*5 + info*1)
    const complianceScore = Math.max(0, 100 - (criticalViolations * 10 + warningViolations * 5 + infoViolations * 1));
    
    const report = {
      floor_plan_id: parseInt(floorPlanId),
      total_violations: totalViolations,
      critical_violations: criticalViolations,
      warning_violations: warningViolations,
      info_violations: infoViolations,
      compliance_score: complianceScore,
      violations: violations
    };
    
    res.json(report);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /code-compliance/violations/{floor_plan_id}:
 *   get:
 *     summary: Get all violations for a floor plan
 *     tags: [Code Compliance]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, warning, info]
 *         description: Filter by severity
 *       - in: query
 *         name: resolved
 *         schema:
 *           type: boolean
 *         description: Filter by resolution status
 *     responses:
 *       200:
 *         description: List of violations
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CodeViolation'
 */
router.get('/violations/:floor_plan_id', (req, res) => {
  const db = getDatabase();
  const floorPlanId = req.params.floor_plan_id;
  const { severity, resolved } = req.query;
  
  let query = 'SELECT * FROM code_violations WHERE floor_plan_id = ?';
  let params = [floorPlanId];
  
  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  
  if (resolved !== undefined) {
    query += ' AND resolved = ?';
    params.push(resolved === 'true' ? 1 : 0);
  }
  
  query += ' ORDER BY severity DESC, created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const violations = rows.map(row => ({
      ...row,
      resolved: Boolean(row.resolved)
    }));
    
    res.json(violations);
  });
});

/**
 * @swagger
 * /code-compliance/violations/{violation_id}/resolve:
 *   put:
 *     summary: Mark a violation as resolved
 *     tags: [Code Compliance]
 *     parameters:
 *       - in: path
 *         name: violation_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Violation resolved
 *       404:
 *         description: Violation not found
 */
router.put('/violations/:violation_id/resolve', (req, res) => {
  const db = getDatabase();
  const violationId = req.params.violation_id;
  
  db.run(`
    UPDATE code_violations 
    SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [violationId], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Violation not found' });
      return;
    }
    
    res.json({ resolved: true });
  });
});

/**
 * @swagger
 * /code-compliance/templates:
 *   get:
 *     summary: Get code compliance templates
 *     tags: [Code Compliance]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [residential, commercial, industrial]
 *         description: Filter by template type
 *     responses:
 *       200:
 *         description: List of compliance templates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   template_type:
 *                     type: string
 *                   code_requirements:
 *                     type: object
 */
router.get('/templates', (req, res) => {
  const db = getDatabase();
  const { type } = req.query;
  
  let query = 'SELECT * FROM project_templates WHERE is_system_template = 1';
  let params = [];
  
  if (type) {
    query += ' AND template_type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY template_type, name';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const templates = rows.map(row => ({
      ...row,
      code_requirements: JSON.parse(row.code_requirements || '{}')
    }));
    
    res.json(templates);
  });
});

// Helper functions for code compliance checking

async function checkGFCIRequirements(db, floorPlanId, entities, rooms) {
  const violations = [];
  
  // Define rooms that require GFCI
  const gfciRequiredRooms = ['bathroom', 'kitchen', 'outdoor', 'garage', 'basement', 'laundry'];
  
  for (const entity of entities) {
    const entityRoom = rooms.find(r => r.id === entity.room_id);
    const roomName = entityRoom ? entityRoom.name.toLowerCase() : '';
    
    // Check if entity is in a room that requires GFCI
    const requiresGFCI = gfciRequiredRooms.some(room => roomName.includes(room)) || 
                        entity.requires_gfci;
    
    if (requiresGFCI && entity.category === 'receptacle' && !entity.gfci) {
      violations.push({
        floor_plan_id: floorPlanId,
        entity_id: entity.id,
        violation_type: 'gfci_required',
        violation_code: 'NEC 210.8',
        description: `GFCI protection required for ${entity.device_type} in ${roomName}`,
        severity: 'critical'
      });
    }
  }
  
  return violations;
}

async function checkAFCIRequirements(db, floorPlanId, entities, rooms) {
  const violations = [];
  
  // Define rooms that require AFCI (bedrooms, living areas)
  const afciRequiredRooms = ['bedroom', 'living', 'family', 'den', 'parlor', 'library', 'study'];
  
  for (const entity of entities) {
    const entityRoom = rooms.find(r => r.id === entity.room_id);
    const roomName = entityRoom ? entityRoom.name.toLowerCase() : '';
    
    // Check if entity is in a room that requires AFCI
    const requiresAFCI = afciRequiredRooms.some(room => roomName.includes(room)) || 
                        entity.requires_afci;
    
    if (requiresAFCI && (entity.category === 'receptacle' || entity.category === 'lighting')) {
      // Check if circuit has AFCI protection (simplified check)
      const hasAFCI = entity.circuit_label && entity.circuit_label.toLowerCase().includes('afci');
      
      if (!hasAFCI) {
        violations.push({
          floor_plan_id: floorPlanId,
          entity_id: entity.id,
          violation_type: 'afci_required',
          violation_code: 'NEC 210.12',
          description: `AFCI protection required for ${entity.device_type} in ${roomName}`,
          severity: 'warning'
        });
      }
    }
  }
  
  return violations;
}

async function checkOutletSpacing(db, floorPlanId, entities, rooms) {
  const violations = [];
  
  // Group outlets by room
  const outletsByRoom = {};
  entities.filter(e => e.category === 'receptacle').forEach(outlet => {
    if (!outletsByRoom[outlet.room_id]) {
      outletsByRoom[outlet.room_id] = [];
    }
    outletsByRoom[outlet.room_id].push(outlet);
  });
  
  // Check spacing within each room
  for (const [roomId, outlets] of Object.entries(outletsByRoom)) {
    const room = rooms.find(r => r.id === parseInt(roomId));
    if (!room) continue;
    
    // Simple spacing check: outlets should be no more than 12 feet apart
    // This is a simplified check - real implementation would need wall measurements
    for (let i = 0; i < outlets.length; i++) {
      for (let j = i + 1; j < outlets.length; j++) {
        const distance = Math.sqrt(
          Math.pow(outlets[i].x - outlets[j].x, 2) + 
          Math.pow(outlets[i].y - outlets[j].y, 2)
        );
        
        // Convert pixels to feet (assuming 10 pixels per foot)
        const distanceFeet = distance / 10;
        
        if (distanceFeet > 12) {
          violations.push({
            floor_plan_id: floorPlanId,
            entity_id: outlets[i].id,
            violation_type: 'outlet_spacing',
            violation_code: 'NEC 210.52',
            description: `Outlets may be more than 12 feet apart in ${room.name}`,
            severity: 'warning'
          });
        }
      }
    }
    
    // Check minimum outlet requirements
    const roomArea = (room.width || 100) * (room.height || 100) / 10000; // Convert to sq ft
    const minOutlets = Math.max(2, Math.ceil(roomArea / 100)); // At least 2, plus 1 per 100 sq ft
    
    if (outlets.length < minOutlets) {
      violations.push({
        floor_plan_id: floorPlanId,
        entity_id: null,
        violation_type: 'insufficient_outlets',
        violation_code: 'NEC 210.52',
        description: `${room.name} may need more outlets (has ${outlets.length}, recommended ${minOutlets})`,
        severity: 'info'
      });
    }
  }
  
  return violations;
}

async function checkLoadViolations(db, floorPlanId, entities) {
  const violations = [];
  
  // Group entities by circuit
  const entitiesByCircuit = {};
  entities.filter(e => e.circuit_id).forEach(entity => {
    if (!entitiesByCircuit[entity.circuit_id]) {
      entitiesByCircuit[entity.circuit_id] = [];
    }
    entitiesByCircuit[entity.circuit_id].push(entity);
  });
  
  // Check each circuit for overload
  for (const [circuitId, circuitEntities] of Object.entries(entitiesByCircuit)) {
    const circuit = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM electrical_circuits WHERE id = ?', [circuitId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!circuit) continue;
    
    const totalLoad = circuitEntities.reduce((sum, entity) => {
      return sum + (entity.wattage || 0);
    }, 0);
    
    const voltage = circuit.breaker_type === 'double' ? 240 : 120;
    const calculatedAmps = totalLoad / voltage;
    const maxContinuousLoad = circuit.amperage * 0.8; // 80% rule
    
    if (calculatedAmps > maxContinuousLoad) {
      violations.push({
        floor_plan_id: floorPlanId,
        entity_id: null,
        violation_type: 'circuit_overload',
        violation_code: 'NEC 210.19',
        description: `Circuit ${circuit.circuit_label} is overloaded (${Math.round(calculatedAmps)}A > ${maxContinuousLoad}A)`,
        severity: 'critical'
      });
    }
  }
  
  return violations;
}

async function checkWireGaugeViolations(db, floorPlanId, entities) {
  const violations = [];
  
  // Get all circuits for this floor plan
  const circuits = await new Promise((resolve, reject) => {
    db.all(`
      SELECT DISTINCT ec.* 
      FROM electrical_circuits ec
      JOIN electrical_panels ep ON ec.panel_id = ep.id
      WHERE ep.floor_plan_id = ?
    `, [floorPlanId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  for (const circuit of circuits) {
    let violation = null;
    
    // Check wire gauge vs breaker amperage compatibility
    if (circuit.wire_gauge === '14 AWG' && circuit.amperage > 15) {
      violation = {
        floor_plan_id: floorPlanId,
        entity_id: null,
        violation_type: 'wire_gauge_mismatch',
        violation_code: 'NEC 240.4',
        description: `14 AWG wire cannot support ${circuit.amperage}A breaker (max 15A)`,
        severity: 'critical'
      };
    } else if (circuit.wire_gauge === '12 AWG' && circuit.amperage > 20) {
      violation = {
        floor_plan_id: floorPlanId,
        entity_id: null,
        violation_type: 'wire_gauge_mismatch',
        violation_code: 'NEC 240.4',
        description: `12 AWG wire cannot support ${circuit.amperage}A breaker (max 20A)`,
        severity: 'critical'
      };
    } else if (circuit.wire_gauge === '10 AWG' && circuit.amperage > 30) {
      violation = {
        floor_plan_id: floorPlanId,
        entity_id: null,
        violation_type: 'wire_gauge_mismatch',
        violation_code: 'NEC 240.4',
        description: `10 AWG wire cannot support ${circuit.amperage}A breaker (max 30A)`,
        severity: 'critical'
      };
    }
    
    if (violation) {
      violations.push(violation);
    }
  }
  
  return violations;
}

module.exports = router; 