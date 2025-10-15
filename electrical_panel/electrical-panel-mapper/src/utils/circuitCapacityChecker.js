/**
 * Circuit Capacity Checker Utility
 * 
 * Provides detailed circuit capacity analysis for load planning,
 * especially useful for adding heaters and other high-load appliances.
 */

import { calculateComponentLoad, formatLoad, getLoadColor } from './loadCalculations';

/**
 * Check if a component can be safely added to a circuit
 * @param {Object} circuit - Circuit to check
 * @param {Array} existingComponents - Components already on circuit
 * @param {Object} newComponent - Component to add
 * @param {Object} deviceTypesService - Device types service
 * @returns {Object} Capacity check result
 */
export function canAddToCircuit(circuit, existingComponents, newComponent, deviceTypesService = null) {
  const voltage = circuit.breaker_type === 'double' ? 240 : (circuit.voltage || 120);
  const maxCapacity = circuit.amperage * voltage;
  const maxContinuous = maxCapacity * 0.8; // NEC 80% rule
  
  // Calculate existing load
  const existingLoad = existingComponents.reduce((sum, comp) => 
    sum + calculateComponentLoad(comp, deviceTypesService), 0
  );
  
  // Calculate new component load
  const newLoad = calculateComponentLoad(newComponent, deviceTypesService);
  
  // Calculate total load with new component
  const totalLoad = existingLoad + newLoad;
  const totalAmperage = totalLoad / voltage;
  const utilizationPercent = (totalLoad / maxContinuous) * 100;
  
  // Determine if safe to add
  const canAdd = totalLoad <= maxContinuous;
  const capacityRemaining = maxContinuous - totalLoad;
  
  // Generate recommendation
  let recommendation = '';
  let severity = 'info';
  
  if (utilizationPercent <= 60) {
    recommendation = 'Safe to add - circuit has plenty of capacity';
    severity = 'success';
  } else if (utilizationPercent <= 80) {
    recommendation = 'Can add, but circuit will be moderately loaded';
    severity = 'info';
  } else if (utilizationPercent <= 100) {
    recommendation = 'Can add, but circuit will be near capacity (80-100% NEC rule)';
    severity = 'warning';
  } else {
    recommendation = `Cannot safely add - would overload circuit by ${formatLoad(totalLoad - maxContinuous)}`;
    severity = 'error';
    
    // Suggest alternatives
    const minCircuitSize = Math.ceil((totalAmperage / 0.8));
    const recommendedBreaker = getRecommendedBreakerSize(minCircuitSize);
    recommendation += `. Consider: (1) Moving some loads to another circuit, (2) Installing a ${recommendedBreaker}A circuit, or (3) Using a 240V heater on a double-pole breaker.`;
  }
  
  return {
    canAdd,
    severity,
    recommendation,
    analysis: {
      existingLoad,
      newLoad,
      totalLoad,
      maxCapacity,
      maxContinuous,
      capacityRemaining,
      existingAmperage: existingLoad / voltage,
      newAmperage: newLoad / voltage,
      totalAmperage,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      voltage,
      breakerSize: circuit.amperage
    }
  };
}

/**
 * Find best circuit for a component
 * @param {Array} circuits - Available circuits
 * @param {Array} allComponents - All components (for load calculation)
 * @param {Object} newComponent - Component to place
 * @param {Object} options - Search options
 * @returns {Object} Best circuit recommendation
 */
export function findBestCircuit(circuits, allComponents, newComponent, options = {}) {
  const {
    preferSameRoom = true,
    preferSameType = true,
    minSafetyMargin = 20, // Prefer circuits with 20% safety margin
    deviceTypesService = null
  } = options;
  
  const newLoad = calculateComponentLoad(newComponent, deviceTypesService);
  
  // Score each circuit
  const scoredCircuits = circuits.map(circuit => {
    const circuitComponents = allComponents.filter(c => c.circuit_id === circuit.id);
    const check = canAddToCircuit(circuit, circuitComponents, newComponent, deviceTypesService);
    
    let score = 0;
    
    // Cannot add at all = disqualify
    if (!check.canAdd) {
      return { circuit, check, score: -1000, disqualified: true };
    }
    
    // Prefer circuits with lower utilization
    const utilizationScore = 100 - check.analysis.utilizationPercent;
    score += utilizationScore * 2;
    
    // Prefer circuits in same room (if room_id available)
    if (preferSameRoom && newComponent.room_id) {
      const sameRoomComponents = circuitComponents.filter(c => c.room_id === newComponent.room_id);
      if (sameRoomComponents.length > 0) {
        score += 50;
      }
    }
    
    // Prefer circuits with similar component types
    if (preferSameType && newComponent.type) {
      const sameTypeComponents = circuitComponents.filter(c => c.type === newComponent.type);
      if (sameTypeComponents.length > 0) {
        score += 30;
      }
    }
    
    // Prefer circuits with good safety margin
    if (check.analysis.utilizationPercent < (100 - minSafetyMargin)) {
      score += 20;
    }
    
    // Penalize empty circuits slightly (prefer consolidation)
    if (circuitComponents.length === 0) {
      score -= 10;
    }
    
    return { circuit, check, score, disqualified: false };
  });
  
  // Sort by score
  scoredCircuits.sort((a, b) => b.score - a.score);
  
  const qualified = scoredCircuits.filter(c => !c.disqualified);
  const disqualified = scoredCircuits.filter(c => c.disqualified);
  
  return {
    best: qualified.length > 0 ? qualified[0] : null,
    alternatives: qualified.slice(1, 4), // Top 3 alternatives
    disqualified: disqualified.length,
    recommendations: generateRecommendations(newComponent, qualified, disqualified)
  };
}

/**
 * Generate recommendations for component placement
 */
function generateRecommendations(component, qualified, disqualified) {
  const recommendations = [];
  
  if (qualified.length === 0) {
    recommendations.push({
      type: 'error',
      message: 'No existing circuits can safely accommodate this component',
      action: 'Install a new dedicated circuit'
    });
    
    // Suggest circuit size
    const load = component.wattage || 1500;
    const amps120 = Math.ceil((load / 120) / 0.8);
    const amps240 = Math.ceil((load / 240) / 0.8);
    
    recommendations.push({
      type: 'info',
      message: `Recommended circuit: ${amps120}A @ 120V or ${amps240}A @ 240V`,
      action: 'Consult electrician for new circuit installation'
    });
  } else if (qualified.length === 1) {
    recommendations.push({
      type: 'warning',
      message: 'Only one circuit available with sufficient capacity',
      action: 'Consider installing additional circuits for future flexibility'
    });
  } else {
    recommendations.push({
      type: 'success',
      message: `${qualified.length} circuits available with sufficient capacity`,
      action: 'Choose based on proximity and existing loads'
    });
  }
  
  return recommendations;
}

/**
 * Get recommended breaker size for given amperage
 */
function getRecommendedBreakerSize(minAmps) {
  const standardSizes = [15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
  return standardSizes.find(size => size >= minAmps) || 100;
}

/**
 * Analyze room heating capacity
 * @param {Object} room - Room object
 * @param {Array} circuits - Available circuits
 * @param {Array} allComponents - All components
 * @param {Object} heaterSpecs - Desired heater specifications
 * @returns {Object} Room heating analysis
 */
export function analyzeRoomHeatingCapacity(room, circuits, allComponents, heaterSpecs, deviceTypesService = null) {
  const {
    wattage = 1500,
    voltage = 120,
    count = 1 // Number of heaters to add
  } = heaterSpecs;
  
  // Find circuits that serve this room
  // Note: room.id is the JSON string ID (e.g., "room-1751497163218")
  // room.dbId is the database integer ID (e.g., 5)
  // Components use room_id which matches room.dbId
  const roomId = room.dbId || room.id; // Use dbId if available, fallback to JSON id
  
  const roomCircuits = circuits.filter(circuit => {
    const circuitComponents = allComponents.filter(c => c.circuit_id === circuit.id);
    return circuitComponents.some(c => c.room_id === roomId);
  });
  
  // Create mock heater component
  const mockHeater = {
    type: 'appliance',
    wattage,
    voltage,
    properties: { appliance_type: 'infrared_heater' },
    room_id: roomId // Use the correct room ID for matching
  };
  
  // Check each circuit
  const circuitAnalysis = roomCircuits.map(circuit => {
    const circuitComponents = allComponents.filter(c => c.circuit_id === circuit.id);
    const check = canAddToCircuit(circuit, circuitComponents, mockHeater, deviceTypesService);
    
    // Calculate actual available capacity (not remaining after adding requested heater)
    const circuitVoltage = circuit.breaker_type === 'double' ? 240 : (circuit.voltage || 120);
    const maxContinuous = circuit.amperage * circuitVoltage * 0.8;
    const actualAvailableCapacity = maxContinuous - check.analysis.existingLoad;
    
    return {
      circuit,
      canAddHeater: check.canAdd,
      maxHeatersCanAdd: calculateMaxHeatersCanAdd(circuit, circuitComponents, wattage, voltage, deviceTypesService),
      currentLoad: check.analysis.existingLoad,
      availableCapacity: actualAvailableCapacity, // Use actual available, not remaining after adding
      check
    };
  });
  
  // Calculate total capacity
  const totalAvailableCapacity = circuitAnalysis.reduce((sum, c) => sum + c.availableCapacity, 0);
  const maxTotalHeaters = Math.floor(totalAvailableCapacity / wattage);
  const canAddAllHeaters = maxTotalHeaters >= count;
  
  return {
    room,
    circuitAnalysis,
    totalAvailableCapacity,
    maxTotalHeaters,
    requestedHeaters: count,
    totalHeaterLoad: wattage * count,
    canAddAllHeaters,
    recommendation: generateHeatingRecommendation(room, circuitAnalysis, heaterSpecs, canAddAllHeaters)
  };
}

/**
 * Calculate maximum number of heaters that can be added to a circuit
 */
function calculateMaxHeatersCanAdd(circuit, existingComponents, heaterWattage, voltage, deviceTypesService) {
  const circuitVoltage = circuit.breaker_type === 'double' ? 240 : (circuit.voltage || 120);
  const maxContinuous = circuit.amperage * circuitVoltage * 0.8;
  
  const existingLoad = existingComponents.reduce((sum, comp) => 
    sum + calculateComponentLoad(comp, deviceTypesService), 0
  );
  
  const availableCapacity = maxContinuous - existingLoad;
  
  // Account for voltage mismatch
  let effectiveHeaterWattage = heaterWattage;
  if (voltage !== circuitVoltage && voltage === 120 && circuitVoltage === 240) {
    // Can't use 120V heater on 240V circuit (need transformer)
    return 0;
  }
  
  return Math.floor(availableCapacity / effectiveHeaterWattage);
}

/**
 * Generate heating recommendation for room
 */
function generateHeatingRecommendation(room, circuitAnalysis, heaterSpecs, canAddAllHeaters) {
  const { wattage, count } = heaterSpecs;
  
  if (circuitAnalysis.length === 0) {
    return {
      type: 'error',
      message: `No circuits currently serve "${room.name}". Install new circuit to add heating.`,
      actions: [
        `Install ${getRecommendedBreakerSize(Math.ceil((wattage / 120) / 0.8))}A circuit for heater(s)`,
        'Consider 240V circuit for more efficient heating'
      ]
    };
  }
  
  if (!canAddAllHeaters) {
    const totalCapacity = circuitAnalysis.reduce((sum, c) => sum + c.maxHeatersCanAdd, 0);
    
    return {
      type: 'warning',
      message: `Current circuits can support ${totalCapacity} of ${count} requested heaters`,
      actions: [
        `Add ${count - totalCapacity} new dedicated circuit(s)`,
        'Consider redistributing existing loads',
        'Use 240V heaters for higher efficiency (half the amperage)'
      ]
    };
  }
  
  // Distribute heaters across circuits
  const distribution = distributeHeatersAcrossCircuits(circuitAnalysis, count);
  
  return {
    type: 'success',
    message: `Can safely add ${count} heater(s) to "${room.name}"`,
    actions: [`Install ${count} × ${wattage}W heater(s)`],
    distribution
  };
}

/**
 * Distribute heaters optimally across available circuits
 */
function distributeHeatersAcrossCircuits(circuitAnalysis, heaterCount) {
  const distribution = [];
  let remaining = heaterCount;
  
  // Sort by available capacity (most to least)
  const sorted = [...circuitAnalysis].sort((a, b) => b.maxHeatersCanAdd - a.maxHeatersCanAdd);
  
  sorted.forEach(analysis => {
    if (remaining === 0) return;
    
    const toAdd = Math.min(analysis.maxHeatersCanAdd, remaining);
    if (toAdd > 0) {
      distribution.push({
        circuit: analysis.circuit,
        heatersToAdd: toAdd,
        remainingCapacity: analysis.availableCapacity - (toAdd * analysis.check.analysis.newLoad)
      });
      remaining -= toAdd;
    }
  });
  
  return distribution;
}

/**
 * Check entire panel for overloaded circuits
 * @param {Array} circuits - All circuits in panel
 * @param {Array} allComponents - All components
 * @returns {Object} Panel health report
 */
export function checkPanelHealth(circuits, allComponents, deviceTypesService = null) {
  const circuitHealth = circuits.map(circuit => {
    const circuitComponents = allComponents.filter(c => c.circuit_id === circuit.id);
    const voltage = circuit.breaker_type === 'double' ? 240 : (circuit.voltage || 120);
    const maxCapacity = circuit.amperage * voltage;
    const maxContinuous = maxCapacity * 0.8;
    
    const totalLoad = circuitComponents.reduce((sum, comp) => 
      sum + calculateComponentLoad(comp, deviceTypesService), 0
    );
    
    const amperage = totalLoad / voltage;
    const utilization = (totalLoad / maxContinuous) * 100;
    
    let status = 'good';
    let severity = 'success';
    
    if (utilization > 100) {
      status = 'overloaded';
      severity = 'error';
    } else if (utilization > 80) {
      status = 'near_capacity';
      severity = 'warning';
    } else if (utilization > 60) {
      status = 'moderate';
      severity = 'info';
    }
    
    return {
      circuit,
      totalLoad,
      amperage,
      utilization: Math.round(utilization * 10) / 10,
      maxContinuous,
      status,
      severity,
      componentCount: circuitComponents.length,
      availableCapacity: maxContinuous - totalLoad
    };
  });
  
  // Calculate panel totals
  const totalLoad = circuitHealth.reduce((sum, c) => sum + c.totalLoad, 0);
  const overloaded = circuitHealth.filter(c => c.status === 'overloaded');
  const nearCapacity = circuitHealth.filter(c => c.status === 'near_capacity');
  const moderate = circuitHealth.filter(c => c.status === 'moderate');
  const good = circuitHealth.filter(c => c.status === 'good');
  
  let overallHealth = 'good';
  if (overloaded.length > 0) overallHealth = 'critical';
  else if (nearCapacity.length > 2) overallHealth = 'warning';
  else if (nearCapacity.length > 0) overallHealth = 'caution';
  
  return {
    overallHealth,
    totalLoad,
    circuitHealth,
    summary: {
      total: circuits.length,
      overloaded: overloaded.length,
      nearCapacity: nearCapacity.length,
      moderate: moderate.length,
      good: good.length
    },
    criticalCircuits: overloaded,
    warnings: nearCapacity,
    recommendations: generatePanelRecommendations(overloaded, nearCapacity, circuits)
  };
}

/**
 * Generate panel-wide recommendations
 */
function generatePanelRecommendations(overloaded, nearCapacity, allCircuits) {
  const recommendations = [];
  
  if (overloaded.length > 0) {
    recommendations.push({
      priority: 'high',
      type: 'overload',
      message: `${overloaded.length} circuit(s) are overloaded and pose a safety risk`,
      action: 'Immediately redistribute loads or install additional circuits',
      circuits: overloaded.map(c => `Breaker ${c.circuit.breaker_position} (${c.circuit.circuit_label || 'unlabeled'})`)
    });
  }
  
  if (nearCapacity.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'capacity',
      message: `${nearCapacity.length} circuit(s) are near capacity (>80%)`,
      action: 'Monitor these circuits and avoid adding more loads',
      circuits: nearCapacity.map(c => `Breaker ${c.circuit.breaker_position} (${c.circuit.circuit_label || 'unlabeled'})`)
    });
  }
  
  // Check for unused circuits
  const unused = allCircuits.filter(c => {
    const health = nearCapacity.find(h => h.circuit.id === c.id) || 
                   overloaded.find(h => h.circuit.id === c.id);
    return !health || health.componentCount === 0;
  });
  
  if (unused.length > 0 && (overloaded.length > 0 || nearCapacity.length > 0)) {
    recommendations.push({
      priority: 'medium',
      type: 'balancing',
      message: `${unused.length} circuit(s) are available for load redistribution`,
      action: 'Consider moving components from overloaded circuits to these circuits',
      circuits: unused.map(c => `Breaker ${c.breaker_position}`)
    });
  }
  
  return recommendations;
}

export default {
  canAddToCircuit,
  findBestCircuit,
  analyzeRoomHeatingCapacity,
  checkPanelHealth,
  getRecommendedBreakerSize
};

