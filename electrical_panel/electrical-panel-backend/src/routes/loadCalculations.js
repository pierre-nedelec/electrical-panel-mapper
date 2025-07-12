const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoadCalculation:
 *       type: object
 *       properties:
 *         circuit_id:
 *           type: integer
 *           description: Circuit identifier
 *         circuit_label:
 *           type: string
 *           description: Circuit name/label
 *         breaker_amperage:
 *           type: integer
 *           description: Breaker amperage rating
 *         wire_gauge:
 *           type: string
 *           description: Wire gauge (e.g., "12 AWG")
 *         total_load_watts:
 *           type: integer
 *           description: Total connected load in watts
 *         calculated_amperage:
 *           type: number
 *           description: Calculated amperage based on load
 *         capacity_percentage:
 *           type: number
 *           description: Percentage of circuit capacity used
 *         safety_margin:
 *           type: number
 *           description: Safety margin percentage
 *         is_overloaded:
 *           type: boolean
 *           description: Whether circuit is overloaded
 *         components:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               label:
 *                 type: string
 *               device_type:
 *                 type: string
 *               wattage:
 *                 type: integer
 *     PanelLoadAnalysis:
 *       type: object
 *       properties:
 *         panel_id:
 *           type: integer
 *         panel_name:
 *           type: string
 *         main_breaker_amps:
 *           type: integer
 *         total_connected_load:
 *           type: integer
 *         calculated_demand:
 *           type: integer
 *         demand_factor:
 *           type: number
 *         capacity_percentage:
 *           type: number
 *         circuits:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LoadCalculation'
 */

/**
 * @swagger
 * /load-calculations/circuit/{circuit_id}:
 *   get:
 *     summary: Calculate load for a specific circuit
 *     tags: [Load Calculations]
 *     parameters:
 *       - in: path
 *         name: circuit_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Circuit load calculation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoadCalculation'
 *       404:
 *         description: Circuit not found
 */
router.get('/circuit/:circuit_id', (req, res) => {
  const db = getDatabase();
  const circuitId = req.params.circuit_id;
  
  // Get circuit details
  db.get('SELECT * FROM electrical_circuits WHERE id = ?', [circuitId], (err, circuit) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!circuit) {
      res.status(404).json({ error: 'Circuit not found' });
      return;
    }
    
    // Get all components on this circuit
    db.all(`
      SELECT e.id, e.label, e.wattage, dt.name as device_type, dt.default_wattage
      FROM entities e
      LEFT JOIN device_types dt ON e.device_type_id = dt.id
      WHERE e.circuit_id = ?
    `, [circuitId], (err, components) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Calculate total load
      let totalLoadWatts = 0;
      const componentLoads = components.map(comp => {
        const wattage = comp.wattage || comp.default_wattage || 0;
        totalLoadWatts += wattage;
        return {
          id: comp.id,
          label: comp.label || `${comp.device_type} ${comp.id}`,
          device_type: comp.device_type,
          wattage: wattage
        };
      });
      
      // Calculate amperage (assuming 120V for single phase, 240V for double)
      const voltage = circuit.breaker_type === 'double' ? 240 : 120;
      const calculatedAmperage = totalLoadWatts / voltage;
      
      // Calculate capacity percentage (NEC recommends 80% max continuous load)
      const maxContinuousLoad = circuit.amperage * 0.8;
      const capacityPercentage = (calculatedAmperage / maxContinuousLoad) * 100;
      const safetyMargin = 100 - capacityPercentage;
      
      const loadCalculation = {
        circuit_id: circuit.id,
        circuit_label: circuit.circuit_label,
        breaker_amperage: circuit.amperage,
        wire_gauge: circuit.wire_gauge,
        total_load_watts: totalLoadWatts,
        calculated_amperage: Math.round(calculatedAmperage * 100) / 100,
        capacity_percentage: Math.round(capacityPercentage * 100) / 100,
        safety_margin: Math.round(safetyMargin * 100) / 100,
        is_overloaded: capacityPercentage > 100,
        components: componentLoads
      };
      
      res.json(loadCalculation);
    });
  });
});

/**
 * @swagger
 * /load-calculations/panel/{panel_id}:
 *   get:
 *     summary: Calculate load analysis for entire panel
 *     tags: [Load Calculations]
 *     parameters:
 *       - in: path
 *         name: panel_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Panel load analysis
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PanelLoadAnalysis'
 *       404:
 *         description: Panel not found
 */
router.get('/panel/:panel_id', async (req, res) => {
  const db = getDatabase();
  const panelId = req.params.panel_id;
  
  try {
    // Get panel details
    const panel = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM electrical_panels WHERE id = ?', [panelId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!panel) {
      res.status(404).json({ error: 'Panel not found' });
      return;
    }
    
    // Get all circuits for this panel
    const circuits = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM electrical_circuits WHERE panel_id = ?', [panelId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // Calculate load for each circuit
    const circuitLoads = [];
    let totalConnectedLoad = 0;
    
    for (const circuit of circuits) {
      const components = await new Promise((resolve, reject) => {
        db.all(`
          SELECT e.id, e.label, e.wattage, dt.name as device_type, dt.default_wattage
          FROM entities e
          LEFT JOIN device_types dt ON e.device_type_id = dt.id
          WHERE e.circuit_id = ?
        `, [circuit.id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      let circuitLoadWatts = 0;
      const componentLoads = components.map(comp => {
        const wattage = comp.wattage || comp.default_wattage || 0;
        circuitLoadWatts += wattage;
        return {
          id: comp.id,
          label: comp.label || `${comp.device_type} ${comp.id}`,
          device_type: comp.device_type,
          wattage: wattage
        };
      });
      
      totalConnectedLoad += circuitLoadWatts;
      
      const voltage = circuit.breaker_type === 'double' ? 240 : 120;
      const calculatedAmperage = circuitLoadWatts / voltage;
      const maxContinuousLoad = circuit.amperage * 0.8;
      const capacityPercentage = (calculatedAmperage / maxContinuousLoad) * 100;
      
      circuitLoads.push({
        circuit_id: circuit.id,
        circuit_label: circuit.circuit_label,
        breaker_amperage: circuit.amperage,
        wire_gauge: circuit.wire_gauge,
        total_load_watts: circuitLoadWatts,
        calculated_amperage: Math.round(calculatedAmperage * 100) / 100,
        capacity_percentage: Math.round(capacityPercentage * 100) / 100,
        safety_margin: Math.round((100 - capacityPercentage) * 100) / 100,
        is_overloaded: capacityPercentage > 100,
        components: componentLoads
      });
    }
    
    // Apply NEC demand factors (simplified calculation)
    const calculatedDemand = calculateDemandLoad(totalConnectedLoad);
    const demandFactor = totalConnectedLoad > 0 ? calculatedDemand / totalConnectedLoad : 1;
    
    // Calculate panel capacity percentage
    const panelCapacityWatts = panel.main_breaker_amps * 240; // Assuming 240V service
    const capacityPercentage = (calculatedDemand / panelCapacityWatts) * 100;
    
    const panelAnalysis = {
      panel_id: panel.id,
      panel_name: panel.panel_name,
      main_breaker_amps: panel.main_breaker_amps,
      total_connected_load: totalConnectedLoad,
      calculated_demand: calculatedDemand,
      demand_factor: Math.round(demandFactor * 100) / 100,
      capacity_percentage: Math.round(capacityPercentage * 100) / 100,
      circuits: circuitLoads
    };
    
    res.json(panelAnalysis);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /load-calculations/floor-plan/{floor_plan_id}:
 *   get:
 *     summary: Calculate load analysis for entire floor plan
 *     tags: [Load Calculations]
 *     parameters:
 *       - in: path
 *         name: floor_plan_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Floor plan load analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 floor_plan_id:
 *                   type: integer
 *                 total_connected_load:
 *                   type: integer
 *                 total_calculated_demand:
 *                   type: integer
 *                 panels:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PanelLoadAnalysis'
 */
router.get('/floor-plan/:floor_plan_id', async (req, res) => {
  const db = getDatabase();
  const floorPlanId = req.params.floor_plan_id;
  
  try {
    // Get all panels for this floor plan
    const panels = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM electrical_panels WHERE floor_plan_id = ?', [floorPlanId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const panelAnalyses = [];
    let totalConnectedLoad = 0;
    let totalCalculatedDemand = 0;
    
    for (const panel of panels) {
      // Reuse panel analysis logic
      const panelResponse = await new Promise((resolve, reject) => {
        // Simulate the panel analysis call
        router.get('/panel/:panel_id', { params: { panel_id: panel.id } }, {
          json: resolve,
          status: () => ({ json: reject })
        });
      });
      
      panelAnalyses.push(panelResponse);
      totalConnectedLoad += panelResponse.total_connected_load;
      totalCalculatedDemand += panelResponse.calculated_demand;
    }
    
    res.json({
      floor_plan_id: parseInt(floorPlanId),
      total_connected_load: totalConnectedLoad,
      total_calculated_demand: totalCalculatedDemand,
      panels: panelAnalyses
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /load-calculations/recommendations/{circuit_id}:
 *   get:
 *     summary: Get load balancing recommendations for a circuit
 *     tags: [Load Calculations]
 *     parameters:
 *       - in: path
 *         name: circuit_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Load balancing recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 circuit_id:
 *                   type: integer
 *                 current_load:
 *                   type: integer
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       description:
 *                         type: string
 *                       priority:
 *                         type: string
 */
router.get('/recommendations/:circuit_id', (req, res) => {
  const db = getDatabase();
  const circuitId = req.params.circuit_id;
  
  // Get circuit load calculation first
  db.get('SELECT * FROM electrical_circuits WHERE id = ?', [circuitId], (err, circuit) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!circuit) {
      res.status(404).json({ error: 'Circuit not found' });
      return;
    }
    
    // Get total load for this circuit
    db.get(`
      SELECT SUM(COALESCE(e.wattage, dt.default_wattage, 0)) as total_load
      FROM entities e
      LEFT JOIN device_types dt ON e.device_type_id = dt.id
      WHERE e.circuit_id = ?
    `, [circuitId], (err, loadResult) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const totalLoad = loadResult.total_load || 0;
      const voltage = circuit.breaker_type === 'double' ? 240 : 120;
      const calculatedAmperage = totalLoad / voltage;
      const maxContinuousLoad = circuit.amperage * 0.8;
      const capacityPercentage = (calculatedAmperage / maxContinuousLoad) * 100;
      
      const recommendations = [];
      
      // Generate recommendations based on load
      if (capacityPercentage > 100) {
        recommendations.push({
          type: 'overload',
          description: 'Circuit is overloaded. Consider splitting loads across multiple circuits.',
          priority: 'high'
        });
        
        if (circuit.amperage < 20) {
          recommendations.push({
            type: 'upgrade_breaker',
            description: 'Consider upgrading to a higher amperage breaker if wire gauge supports it.',
            priority: 'medium'
          });
        }
      } else if (capacityPercentage > 80) {
        recommendations.push({
          type: 'near_capacity',
          description: 'Circuit is near capacity. Monitor for additional loads.',
          priority: 'medium'
        });
      }
      
      if (circuit.wire_gauge === '14 AWG' && circuit.amperage > 15) {
        recommendations.push({
          type: 'wire_gauge_mismatch',
          description: '14 AWG wire should not be used with breakers over 15A.',
          priority: 'high'
        });
      }
      
      if (circuit.wire_gauge === '12 AWG' && circuit.amperage > 20) {
        recommendations.push({
          type: 'wire_gauge_mismatch',
          description: '12 AWG wire should not be used with breakers over 20A.',
          priority: 'high'
        });
      }
      
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'good',
          description: 'Circuit load is within safe operating parameters.',
          priority: 'low'
        });
      }
      
      res.json({
        circuit_id: circuit.id,
        current_load: totalLoad,
        capacity_percentage: Math.round(capacityPercentage * 100) / 100,
        recommendations: recommendations
      });
    });
  });
});

/**
 * Simplified NEC demand factor calculation
 * @param {number} totalConnectedLoad - Total connected load in watts
 * @returns {number} Calculated demand in watts
 */
function calculateDemandLoad(totalConnectedLoad) {
  // Simplified residential demand calculation based on NEC Article 220
  // This is a basic implementation - real-world calculations are more complex
  
  if (totalConnectedLoad <= 3000) {
    return totalConnectedLoad; // 100% demand for first 3kW
  } else if (totalConnectedLoad <= 120000) {
    return 3000 + (totalConnectedLoad - 3000) * 0.35; // 35% demand for next 117kW
  } else {
    return 3000 + 117000 * 0.35 + (totalConnectedLoad - 120000) * 0.25; // 25% demand for remainder
  }
}

module.exports = router; 