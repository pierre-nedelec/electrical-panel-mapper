const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     MaterialItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Material item ID
 *         floor_plan_id:
 *           type: integer
 *           description: Floor plan ID
 *         material_type:
 *           type: string
 *           description: Type of material (wire, breaker, outlet, etc.)
 *         description:
 *           type: string
 *           description: Material description
 *         quantity:
 *           type: integer
 *           description: Quantity needed
 *         unit:
 *           type: string
 *           description: Unit of measurement
 *         unit_cost:
 *           type: number
 *           description: Cost per unit
 *         total_cost:
 *           type: number
 *           description: Total cost for this item
 *         supplier:
 *           type: string
 *           description: Preferred supplier
 *         part_number:
 *           type: string
 *           description: Manufacturer part number
 *     MaterialsList:
 *       type: object
 *       properties:
 *         floor_plan_id:
 *           type: integer
 *         total_cost:
 *           type: number
 *         total_items:
 *           type: integer
 *         categories:
 *           type: object
 *           description: Materials grouped by category
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MaterialItem'
 */

/**
 * @swagger
 * /materials/generate/{floor_plan_id}:
 *   post:
 *     summary: Generate materials list for a floor plan
 *     tags: [Materials]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               include_labor:
 *                 type: boolean
 *                 description: Include labor costs
 *               markup_percentage:
 *                 type: number
 *                 description: Markup percentage for pricing
 *               wire_run_factor:
 *                 type: number
 *                 description: Factor for estimating wire runs (default 1.2)
 *     responses:
 *       200:
 *         description: Generated materials list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialsList'
 */
router.post('/generate/:floor_plan_id', async (req, res) => {
  const db = getDatabase();
  const floorPlanId = req.params.floor_plan_id;
  const { include_labor = false, markup_percentage = 0, wire_run_factor = 1.2 } = req.body;
  
  try {
    // Clear existing materials list for this floor plan
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM materials_list WHERE floor_plan_id = ?', [floorPlanId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Get all entities for this floor plan
    const entities = await new Promise((resolve, reject) => {
      db.all(`
        SELECT e.*, dt.name as device_type, dt.category, dt.default_wattage
        FROM entities e
        LEFT JOIN device_types dt ON e.device_type_id = dt.id
        WHERE e.floor_plan_id = ?
      `, [floorPlanId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Get electrical panels
    const panels = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM electrical_panels WHERE floor_plan_id = ?', [floorPlanId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Get electrical circuits
    const circuits = await new Promise((resolve, reject) => {
      db.all(`
        SELECT ec.* FROM electrical_circuits ec
        JOIN electrical_panels ep ON ec.panel_id = ep.id
        WHERE ep.floor_plan_id = ?
      `, [floorPlanId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const materials = [];
    
    // Generate materials for electrical components
    materials.push(...generateComponentMaterials(entities));
    
    // Generate materials for panels and breakers
    materials.push(...generatePanelMaterials(panels, circuits));
    
    // Generate wire materials
    materials.push(...generateWireMaterials(circuits, entities, wire_run_factor));
    
    // Generate conduit and fittings
    materials.push(...generateConduitMaterials(circuits));
    
    // Add labor if requested
    if (include_labor) {
      materials.push(...generateLaborEstimate(entities, circuits));
    }
    
    // Apply markup if specified
    if (markup_percentage > 0) {
      materials.forEach(material => {
        material.unit_cost *= (1 + markup_percentage / 100);
        material.total_cost = material.quantity * material.unit_cost;
      });
    }
    
    // Insert materials into database
    for (const material of materials) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO materials_list (
            floor_plan_id, material_type, description, quantity, unit, 
            unit_cost, total_cost, supplier, part_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          floorPlanId,
          material.material_type,
          material.description,
          material.quantity,
          material.unit,
          material.unit_cost,
          material.total_cost,
          material.supplier || null,
          material.part_number || null
        ], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Calculate totals and group by category
    const totalCost = materials.reduce((sum, item) => sum + item.total_cost, 0);
    const totalItems = materials.length;
    
    const categories = materials.reduce((acc, item) => {
      if (!acc[item.material_type]) {
        acc[item.material_type] = {
          items: [],
          total_cost: 0,
          total_quantity: 0
        };
      }
      acc[item.material_type].items.push(item);
      acc[item.material_type].total_cost += item.total_cost;
      acc[item.material_type].total_quantity += item.quantity;
      return acc;
    }, {});
    
    const materialsList = {
      floor_plan_id: parseInt(floorPlanId),
      total_cost: Math.round(totalCost * 100) / 100,
      total_items: totalItems,
      categories: categories,
      items: materials
    };
    
    res.json(materialsList);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /materials/{floor_plan_id}:
 *   get:
 *     summary: Get materials list for a floor plan
 *     tags: [Materials]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by material category
 *     responses:
 *       200:
 *         description: Materials list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialsList'
 */
router.get('/:floor_plan_id', (req, res) => {
  const db = getDatabase();
  const floorPlanId = req.params.floor_plan_id;
  const { category } = req.query;
  
  let query = 'SELECT * FROM materials_list WHERE floor_plan_id = ?';
  let params = [floorPlanId];
  
  if (category) {
    query += ' AND material_type = ?';
    params.push(category);
  }
  
  query += ' ORDER BY material_type, description';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const totalCost = rows.reduce((sum, item) => sum + item.total_cost, 0);
    const totalItems = rows.length;
    
    const categories = rows.reduce((acc, item) => {
      if (!acc[item.material_type]) {
        acc[item.material_type] = {
          items: [],
          total_cost: 0,
          total_quantity: 0
        };
      }
      acc[item.material_type].items.push(item);
      acc[item.material_type].total_cost += item.total_cost;
      acc[item.material_type].total_quantity += item.quantity;
      return acc;
    }, {});
    
    res.json({
      floor_plan_id: parseInt(floorPlanId),
      total_cost: Math.round(totalCost * 100) / 100,
      total_items: totalItems,
      categories: categories,
      items: rows
    });
  });
});

/**
 * @swagger
 * /materials/{floor_plan_id}/export:
 *   get:
 *     summary: Export materials list as CSV
 *     tags: [Materials]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/:floor_plan_id/export', (req, res) => {
  const db = getDatabase();
  const floorPlanId = req.params.floor_plan_id;
  
  db.all('SELECT * FROM materials_list WHERE floor_plan_id = ? ORDER BY material_type, description', [floorPlanId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Generate CSV
    const headers = ['Material Type', 'Description', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Supplier', 'Part Number'];
    const csvRows = [headers.join(',')];
    
    rows.forEach(row => {
      const csvRow = [
        row.material_type,
        `"${row.description}"`,
        row.quantity,
        row.unit,
        row.unit_cost.toFixed(2),
        row.total_cost.toFixed(2),
        row.supplier || '',
        row.part_number || ''
      ];
      csvRows.push(csvRow.join(','));
    });
    
    const csv = csvRows.join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="materials_list_${floorPlanId}.csv"`);
    res.send(csv);
  });
});

// Helper functions for materials generation

function generateComponentMaterials(entities) {
  const materials = [];
  const componentCounts = {};
  
  // Count components by type
  entities.forEach(entity => {
    const key = entity.device_type || 'Unknown Device';
    componentCounts[key] = (componentCounts[key] || 0) + 1;
  });
  
  // Generate material items for components
  Object.entries(componentCounts).forEach(([deviceType, count]) => {
    const materialType = getComponentMaterialType(deviceType);
    const unitCost = getEstimatedComponentCost(deviceType);
    
    materials.push({
      material_type: materialType,
      description: deviceType,
      quantity: count,
      unit: 'each',
      unit_cost: unitCost,
      total_cost: count * unitCost,
      supplier: 'Electrical Supply',
      part_number: null
    });
  });
  
  return materials;
}

function generatePanelMaterials(panels, circuits) {
  const materials = [];
  
  panels.forEach(panel => {
    // Add panel itself
    materials.push({
      material_type: 'panel',
      description: `${panel.panel_type} Panel - ${panel.total_positions} Position`,
      quantity: 1,
      unit: 'each',
      unit_cost: getEstimatedPanelCost(panel.total_positions),
      total_cost: getEstimatedPanelCost(panel.total_positions),
      supplier: 'Electrical Supply',
      part_number: null
    });
    
    // Count breakers by type
    const breakerCounts = {};
    circuits.filter(c => c.panel_id === panel.id).forEach(circuit => {
      const breakerType = `${circuit.amperage}A ${circuit.breaker_type}`;
      breakerCounts[breakerType] = (breakerCounts[breakerType] || 0) + 1;
    });
    
    // Add breakers
    Object.entries(breakerCounts).forEach(([breakerType, count]) => {
      const unitCost = getEstimatedBreakerCost(breakerType);
      materials.push({
        material_type: 'breaker',
        description: `${breakerType} Breaker`,
        quantity: count,
        unit: 'each',
        unit_cost: unitCost,
        total_cost: count * unitCost,
        supplier: 'Electrical Supply',
        part_number: null
      });
    });
  });
  
  return materials;
}

function generateWireMaterials(circuits, entities, wireRunFactor) {
  const materials = [];
  const wireCounts = {};
  
  circuits.forEach(circuit => {
    const wireGauge = circuit.wire_gauge || '12 AWG';
    const wireType = circuit.breaker_type === 'double' ? '3-wire' : '2-wire';
    const wireKey = `${wireGauge} ${wireType}`;
    
    // Estimate wire length (simplified calculation)
    const circuitEntities = entities.filter(e => e.circuit_id === circuit.id);
    let estimatedLength = 50; // Base run to panel
    
    if (circuitEntities.length > 0) {
      // Add distance between components (simplified)
      estimatedLength += circuitEntities.length * 20;
    }
    
    // Apply wire run factor for waste and routing
    estimatedLength *= wireRunFactor;
    
    wireCounts[wireKey] = (wireCounts[wireKey] || 0) + estimatedLength;
  });
  
  // Add wire materials
  Object.entries(wireCounts).forEach(([wireType, length]) => {
    const unitCost = getEstimatedWireCost(wireType);
    materials.push({
      material_type: 'wire',
      description: `${wireType} Romex Cable`,
      quantity: Math.ceil(length),
      unit: 'feet',
      unit_cost: unitCost,
      total_cost: Math.ceil(length) * unitCost,
      supplier: 'Electrical Supply',
      part_number: null
    });
  });
  
  return materials;
}

function generateConduitMaterials(circuits) {
  const materials = [];
  
  // Estimate conduit needs (simplified)
  const totalCircuits = circuits.length;
  const estimatedConduit = totalCircuits * 10; // 10 feet per circuit average
  
  if (estimatedConduit > 0) {
    materials.push({
      material_type: 'conduit',
      description: '1/2" EMT Conduit',
      quantity: Math.ceil(estimatedConduit / 10), // 10-foot sticks
      unit: 'each',
      unit_cost: 8.50,
      total_cost: Math.ceil(estimatedConduit / 10) * 8.50,
      supplier: 'Electrical Supply',
      part_number: null
    });
    
    // Add fittings
    const fittingsCount = Math.ceil(totalCircuits * 2); // 2 fittings per circuit
    materials.push({
      material_type: 'fittings',
      description: '1/2" EMT Connectors',
      quantity: fittingsCount,
      unit: 'each',
      unit_cost: 1.25,
      total_cost: fittingsCount * 1.25,
      supplier: 'Electrical Supply',
      part_number: null
    });
  }
  
  return materials;
}

function generateLaborEstimate(entities, circuits) {
  const materials = [];
  
  // Estimate labor hours
  const componentHours = entities.length * 0.5; // 30 minutes per component
  const circuitHours = circuits.length * 1.0; // 1 hour per circuit
  const totalHours = componentHours + circuitHours;
  
  const laborRate = 75; // $75/hour
  
  materials.push({
    material_type: 'labor',
    description: 'Electrical Installation Labor',
    quantity: Math.ceil(totalHours),
    unit: 'hours',
    unit_cost: laborRate,
    total_cost: Math.ceil(totalHours) * laborRate,
    supplier: 'Labor',
    part_number: null
  });
  
  return materials;
}

// Pricing helper functions

function getComponentMaterialType(deviceType) {
  const type = deviceType.toLowerCase();
  if (type.includes('outlet') || type.includes('receptacle')) return 'outlet';
  if (type.includes('switch')) return 'switch';
  if (type.includes('light')) return 'lighting';
  return 'component';
}

function getEstimatedComponentCost(deviceType) {
  const type = deviceType.toLowerCase();
  if (type.includes('gfci')) return 25.00;
  if (type.includes('outlet') || type.includes('receptacle')) return 3.50;
  if (type.includes('switch')) return 2.75;
  if (type.includes('light')) return 15.00;
  if (type.includes('fan')) return 45.00;
  return 5.00; // Default
}

function getEstimatedPanelCost(positions) {
  if (positions <= 12) return 125.00;
  if (positions <= 24) return 175.00;
  if (positions <= 30) return 225.00;
  return 300.00;
}

function getEstimatedBreakerCost(breakerType) {
  const type = breakerType.toLowerCase();
  if (type.includes('gfci')) return 45.00;
  if (type.includes('afci')) return 35.00;
  if (type.includes('double')) return 25.00;
  return 15.00; // Standard single pole
}

function getEstimatedWireCost(wireType) {
  const type = wireType.toLowerCase();
  if (type.includes('14 awg')) return 0.75; // per foot
  if (type.includes('12 awg')) return 1.25; // per foot
  if (type.includes('10 awg')) return 2.00; // per foot
  return 1.00; // Default
}

module.exports = router; 