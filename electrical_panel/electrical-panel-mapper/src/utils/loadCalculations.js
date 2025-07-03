/**
 * NEC Load Calculation Utilities
 * 
 * Provides electrical load calculations following National Electrical Code (NEC) standards
 * for residential electrical systems.
 */

// Standard electrical loads for common components (watts)
export const COMPONENT_LOADS = {
  outlet: {
    standard: 180,      // NEC 220.14(I) - 180VA per outlet
    kitchen: 1500,      // Small appliance branch circuit load
    bathroom: 1500,     // Bathroom branch circuit load
    laundry: 1500,      // Laundry branch circuit load
    gfci: 180,          // Same as standard outlet
  },
  light: {
    standard: 100,      // Typical LED/CFL fixture
    recessed: 75,       // LED recessed light
    ceiling_fan: 150,   // Ceiling fan with light
    chandelier: 300,    // Multi-bulb fixture
    fluorescent: 40,    // Fluorescent fixture
  },
  switch: {
    standard: 0,        // Switches don't consume power
    dimmer: 5,          // Dimmer switch losses
    smart: 3,           // Smart switch standby power
  },
  appliance: {
    refrigerator: 800,
    microwave: 1500,
    dishwasher: 1800,
    garbage_disposal: 900,
    range_hood: 300,
    electric_range: 8000,
    electric_dryer: 5000,
    electric_water_heater: 4500,
    air_conditioner: 3500,
    heat_pump: 4000,
    baseboard_heater: 1500,      // Per linear foot typically
    jacuzzi: 7000,               // Typical hot tub/spa
    hvac_unit: 4000,             // Central air handler
    ceiling_fan: 150,            // Ceiling fan motor + light
    floor_heating: 2000,         // Floor heating per room typical
  },
  panel: {
    main: 0,            // Panels don't consume power
    sub: 0,
  }
};

// NEC demand factors for different load types
export const DEMAND_FACTORS = {
  lighting: {
    first_3000: 1.0,    // 100% of first 3000VA
    remainder: 0.35,    // 35% of remainder over 3000VA
  },
  outlets: {
    first_10000: 1.0,   // 100% of first 10kVA
    remainder: 0.5,     // 50% of remainder
  },
  appliances: {
    first_appliance: 1.0,     // 100% of largest appliance
    second_appliance: 0.75,   // 75% of second largest
    additional: 0.25,         // 25% of additional appliances
  }
};

// Standard circuit breaker sizes (amperes)
export const BREAKER_SIZES = [15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

// Wire gauge capacity (amperes) at 60°C
export const WIRE_CAPACITY = {
  '14': 15,    // 14 AWG = 15A
  '12': 20,    // 12 AWG = 20A  
  '10': 30,    // 10 AWG = 30A
  '8': 40,     // 8 AWG = 40A
  '6': 55,     // 6 AWG = 55A
  '4': 70,     // 4 AWG = 70A
  '2': 95,     // 2 AWG = 95A
  '1': 110,    // 1 AWG = 110A
  '1/0': 125,  // 1/0 AWG = 125A
  '2/0': 145,  // 2/0 AWG = 145A
  '3/0': 165,  // 3/0 AWG = 165A
  '4/0': 195,  // 4/0 AWG = 195A
};

/**
 * Calculate the electrical load for a component
 * @param {Object} component - Component with type and properties
 * @returns {number} Load in watts
 */
export function calculateComponentLoad(component) {
  const { type, properties = {}, wattage } = component;
  
  // Use custom wattage if specified at component level
  if (wattage && wattage > 0) {
    return wattage;
  }
  
  // Handle specific component types
  switch (type) {
    case 'outlet':
      if (properties.kitchen) return COMPONENT_LOADS.outlet.kitchen;
      if (properties.bathroom) return COMPONENT_LOADS.outlet.bathroom;
      if (properties.laundry) return COMPONENT_LOADS.outlet.laundry;
      return COMPONENT_LOADS.outlet.standard;
      
    case 'light':
      if (properties.fixture_type) {
        return COMPONENT_LOADS.light[properties.fixture_type] || COMPONENT_LOADS.light.standard;
      }
      return COMPONENT_LOADS.light.standard;
      
    case 'switch':
      if (properties.dimmer) return COMPONENT_LOADS.switch.dimmer;
      if (properties.smart) return COMPONENT_LOADS.switch.smart;
      return COMPONENT_LOADS.switch.standard;
      
    case 'appliance':
      // Use custom wattage if specified in properties (backward compatibility)
      if (properties.wattage) return properties.wattage;
      
      if (properties.appliance_type && COMPONENT_LOADS.appliance[properties.appliance_type]) {
        return COMPONENT_LOADS.appliance[properties.appliance_type];
      }
      return 1500; // Default appliance load
      
    case 'panel':
      return COMPONENT_LOADS.panel.main;
      
    default:
      return properties.wattage || 0;
  }
}

/**
 * Calculate total load for a circuit
 * @param {Array} components - Array of components on the circuit
 * @returns {Object} Load calculation results
 */
export function calculateCircuitLoad(components) {
  let totalLoad = 0;
  let lightingLoad = 0;
  let outletLoad = 0;
  let applianceLoad = 0;
  
  components.forEach(component => {
    const load = calculateComponentLoad(component);
    totalLoad += load;
    
    // Categorize loads for demand factor calculations
    switch (component.type) {
      case 'light':
        lightingLoad += load;
        break;
      case 'outlet':
        outletLoad += load;
        break;
      case 'appliance':
        applianceLoad += load;
        break;
    }
  });
  
  return {
    totalLoad,
    lightingLoad,
    outletLoad,
    applianceLoad,
    componentCount: components.length,
    averageLoad: components.length > 0 ? totalLoad / components.length : 0
  };
}

/**
 * Calculate circuit capacity and utilization
 * @param {Object} circuit - Circuit with breaker size and components
 * @returns {Object} Capacity analysis
 */
export function calculateCircuitCapacity(circuit) {
  const { amperage = 20, components = [], voltage = 120 } = circuit;
  
  // Calculate total circuit capacity in watts
  const maxCapacity = amperage * voltage;
  
  // Calculate current load
  const loadData = calculateCircuitLoad(components);
  const currentLoad = loadData.totalLoad;
  
  // Calculate utilization percentage
  const utilization = (currentLoad / maxCapacity) * 100;
  
  // Calculate available capacity
  const availableCapacity = maxCapacity - currentLoad;
  
  // Determine status
  let status = 'normal';
  if (utilization > 80) {
    status = 'warning';  // NEC recommends not exceeding 80% continuous load
  }
  if (utilization > 100) {
    status = 'overload';
  }
  
  return {
    maxCapacity,
    currentLoad,
    availableCapacity,
    utilization: Math.round(utilization * 10) / 10, // Round to 1 decimal
    status,
    ...loadData
  };
}

/**
 * Suggest appropriate wire gauge for a circuit
 * @param {number} amperage - Circuit breaker size in amperes
 * @returns {string} Recommended wire gauge
 */
export function suggestWireGauge(amperage) {
  // Find the smallest wire gauge that can handle the amperage
  for (const [gauge, capacity] of Object.entries(WIRE_CAPACITY)) {
    if (capacity >= amperage) {
      return gauge + ' AWG';
    }
  }
  return '4/0 AWG'; // Largest standard size
}

/**
 * Validate circuit configuration
 * @param {Object} circuit - Circuit configuration
 * @returns {Array} Array of validation issues
 */
export function validateCircuit(circuit) {
  const issues = [];
  const capacity = calculateCircuitCapacity(circuit);
  
  // Check for overload
  if (capacity.status === 'overload') {
    issues.push({
      type: 'error',
      message: `Circuit overloaded: ${capacity.currentLoad}W exceeds ${capacity.maxCapacity}W capacity`,
      suggestion: `Reduce load or increase breaker size to ${Math.ceil(capacity.currentLoad / circuit.voltage)}A`
    });
  }
  
  // Check for high utilization
  if (capacity.status === 'warning') {
    issues.push({
      type: 'warning',
      message: `Circuit utilization high: ${capacity.utilization}% (NEC recommends ≤80%)`,
      suggestion: 'Consider redistributing some components to other circuits'
    });
  }
  
  // Check wire gauge compatibility
  if (circuit.wire_gauge) {
    const wireCapacity = WIRE_CAPACITY[circuit.wire_gauge.replace(' AWG', '')];
    if (wireCapacity && wireCapacity < circuit.amperage) {
      issues.push({
        type: 'error',
        message: `Wire gauge ${circuit.wire_gauge} insufficient for ${circuit.amperage}A breaker`,
        suggestion: `Use ${suggestWireGauge(circuit.amperage)} or larger`
      });
    }
  }
  
  return issues;
}

/**
 * Calculate panel load summary
 * @param {Array} circuits - Array of all circuits in panel
 * @returns {Object} Panel load analysis
 */
export function calculatePanelLoad(circuits) {
  let totalConnectedLoad = 0;
  let totalDemandLoad = 0;
  let circuitCount = circuits.length;
  let overloadedCircuits = 0;
  
  circuits.forEach(circuit => {
    const capacity = calculateCircuitCapacity(circuit);
    totalConnectedLoad += capacity.currentLoad;
    
    if (capacity.status === 'overload') {
      overloadedCircuits++;
    }
    
    // Apply demand factors (simplified)
    totalDemandLoad += capacity.currentLoad * 0.8; // Simplified 80% demand factor
  });
  
  return {
    totalConnectedLoad,
    totalDemandLoad,
    circuitCount,
    overloadedCircuits,
    averageCircuitLoad: circuitCount > 0 ? totalConnectedLoad / circuitCount : 0,
    panelUtilization: totalDemandLoad / (200 * 240) * 100 // Assuming 200A panel
  };
}

/**
 * Get load color indicator based on utilization
 * @param {number} utilization - Utilization percentage (0-100)
 * @returns {string} Color code for UI
 */
export function getLoadColor(utilization) {
  if (utilization <= 60) return '#4caf50';  // Green - good
  if (utilization <= 80) return '#ff9800';  // Orange - caution
  return '#f44336';                         // Red - warning/overload
}

/**
 * Format load value for display
 * @param {number} watts - Load in watts
 * @returns {string} Formatted load string
 */
export function formatLoad(watts) {
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(1)}kW`;
  }
  return `${Math.round(watts)}W`;
}

/**
 * Format capacity for display
 * @param {number} watts - Capacity in watts
 * @returns {string} Formatted capacity string
 */
export function formatCapacity(watts) {
  return formatLoad(watts);
}

/**
 * ENHANCED LOAD CALCULATION SYSTEM
 * Real-time analysis with NEC compliance checking
 */

/**
 * Calculate room-by-room load analysis
 * @param {Array} rooms - Array of rooms with components
 * @param {Array} allComponents - All electrical components  
 * @returns {Object} Room load analysis
 */
export function calculateRoomLoads(rooms, allComponents) {
  const roomAnalysis = {};
  
  rooms.forEach(room => {
    // Find components in this room
    const roomComponents = allComponents.filter(comp => 
      comp.x >= room.x && 
      comp.x <= room.x + room.width && 
      comp.y >= room.y && 
      comp.y <= room.y + room.height
    );
    
    // Calculate loads by category
    const lightingLoad = roomComponents
      .filter(c => c.type === 'light')
      .reduce((sum, c) => sum + calculateComponentLoad(c), 0);
      
    const outletLoad = roomComponents
      .filter(c => c.type === 'outlet')
      .reduce((sum, c) => sum + calculateComponentLoad(c), 0);
      
    const applianceLoad = roomComponents
      .filter(c => c.type === 'appliance')
      .reduce((sum, c) => sum + calculateComponentLoad(c), 0);
    
    const totalLoad = lightingLoad + outletLoad + applianceLoad;
    
    // NEC requirements for specific rooms
    const necRequirements = getNECRoomRequirements(room.label);
    
    roomAnalysis[room.id] = {
      roomName: room.name || room.label || `Room ${room.id}`,
      area: room.width * room.height, // in sq units
      components: roomComponents.length,
      loads: {
        lighting: lightingLoad,
        outlets: outletLoad,
        appliances: applianceLoad,
        total: totalLoad
      },
      necRequirements,
      compliance: checkRoomCompliance(room, roomComponents, necRequirements),
      recommendedCircuits: calculateRecommendedCircuits(room, roomComponents)
    };
  });
  
  return roomAnalysis;
}

/**
 * Get NEC requirements for specific room types
 * @param {string} roomType - Type of room (kitchen, bathroom, etc.)
 * @returns {Object} NEC requirements
 */
export function getNECRoomRequirements(roomType) {
  const type = roomType?.toLowerCase() || '';
  
  const requirements = {
    kitchen: {
      smallApplianceCircuits: 2,  // NEC 210.11(C)(1)
      minOutlets: 4,              // NEC 210.52(C)
      gfciRequired: true,         // NEC 210.8(A)(6)
      dedicatedCircuits: ['refrigerator', 'microwave'],
      lightingLoad: 3,            // 3VA per sq ft
      specialRequirements: [
        'GFCI protection required for all outlets',
        'At least 2 small appliance circuits (20A)',
        'Counter outlets max 4ft apart'
      ]
    },
    bathroom: {
      minOutlets: 1,              // NEC 210.52(D)
      gfciRequired: true,         // NEC 210.8(A)(1)
      dedicatedCircuit: true,     // NEC 210.11(C)(3)
      lightingLoad: 3,
      specialRequirements: [
        'GFCI protection required',
        'At least one 20A circuit for outlets',
        'Outlet within 3ft of sink'
      ]
    },
    bedroom: {
      minOutlets: 2,              // NEC 210.52(A)
      afciRequired: true,         // NEC 210.12(A)
      lightingLoad: 3,
      specialRequirements: [
        'AFCI protection required',
        'Outlets max 12ft apart'
      ]
    },
    laundry: {
      dedicatedCircuit: true,     // NEC 210.11(C)(2)
      minOutlets: 1,
      gfciRequired: true,
      lightingLoad: 3,
      specialRequirements: [
        'Dedicated 20A circuit for laundry',
        'GFCI protection if within 6ft of sink'
      ]
    },
    garage: {
      minOutlets: 1,              // NEC 210.52(G)
      gfciRequired: true,         // NEC 210.8(A)(2)
      lightingLoad: 3,
      specialRequirements: [
        'GFCI protection required',
        'At least one outlet'
      ]
    },
    default: {
      minOutlets: 1,
      lightingLoad: 3,            // 3VA per sq ft general lighting
      specialRequirements: [
        'General lighting and outlet requirements'
      ]
    }
  };
  
  return requirements[type] || requirements.default;
}

/**
 * Check room compliance with NEC requirements
 * @param {Object} room - Room object
 * @param {Array} components - Components in room
 * @param {Object} necReqs - NEC requirements
 * @returns {Object} Compliance status
 */
export function checkRoomCompliance(room, components, necReqs) {
  const violations = [];
  const warnings = [];
  
  // Check outlet count
  const outlets = components.filter(c => c.type === 'outlet');
  if (outlets.length < necReqs.minOutlets) {
    violations.push(`Insufficient outlets: ${outlets.length} found, ${necReqs.minOutlets} required`);
  }
  
  // Check GFCI requirements
  if (necReqs.gfciRequired) {
    const gfciOutlets = outlets.filter(o => o.properties?.gfci);
    const nonGfciOutlets = outlets.filter(o => !o.properties?.gfci);
    if (nonGfciOutlets.length > 0) {
      violations.push(`${nonGfciOutlets.length} outlets missing GFCI protection`);
    }
  }
  
  // Check AFCI requirements  
  if (necReqs.afciRequired) {
    const afciProtected = components.filter(c => c.properties?.afci);
    if (afciProtected.length === 0) {
      warnings.push('AFCI protection may be required');
    }
  }
  
  // Check lighting load density
  const roomArea = (room.width || 100) * (room.height || 100) / 10000; // Convert to sq ft estimate
  const requiredLighting = roomArea * necReqs.lightingLoad;
  const actualLighting = components
    .filter(c => c.type === 'light')
    .reduce((sum, c) => sum + calculateComponentLoad(c), 0);
    
  if (actualLighting < requiredLighting) {
    warnings.push(`Lighting may be insufficient: ${actualLighting}W provided, ${requiredLighting}W recommended`);
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    warnings,
    score: violations.length === 0 ? (warnings.length === 0 ? 100 : 85) : 60
  };
}

/**
 * Calculate recommended circuits for a room
 * @param {Object} room - Room object
 * @param {Array} components - Components in room  
 * @returns {Array} Recommended circuit configuration
 */
export function calculateRecommendedCircuits(room, components) {
  const recommendations = [];
  const roomType = room.label?.toLowerCase() || '';
  
  // Group components by type and load
  const lights = components.filter(c => c.type === 'light');
  const outlets = components.filter(c => c.type === 'outlet');
  const appliances = components.filter(c => c.type === 'appliance');
  
  // Lighting circuit recommendations
  if (lights.length > 0) {
    const lightingLoad = lights.reduce((sum, l) => sum + calculateComponentLoad(l), 0);
    const circuitsNeeded = Math.ceil(lightingLoad / 1440); // 80% of 15A circuit = 1440W
    
    recommendations.push({
      type: 'lighting',
      circuits: circuitsNeeded,
      amperage: 15,
      components: lights.length,
      totalLoad: lightingLoad,
      description: `${circuitsNeeded} lighting circuit${circuitsNeeded > 1 ? 's' : ''} (15A)`
    });
  }
  
  // Outlet circuit recommendations
  if (outlets.length > 0) {
    const outletLoad = outlets.reduce((sum, o) => sum + calculateComponentLoad(o), 0);
    let circuitsNeeded;
    let amperage;
    
    // Special requirements for specific rooms
    if (roomType === 'kitchen') {
      circuitsNeeded = Math.max(2, Math.ceil(outletLoad / 1920)); // 20A circuits
      amperage = 20;
    } else if (roomType === 'bathroom' || roomType === 'laundry') {
      circuitsNeeded = Math.max(1, Math.ceil(outletLoad / 1920)); // 20A circuit
      amperage = 20;
    } else {
      circuitsNeeded = Math.ceil(outletLoad / 1920); // 20A circuits for safety
      amperage = 20;
    }
    
    recommendations.push({
      type: 'outlets',
      circuits: circuitsNeeded,
      amperage: amperage,
      components: outlets.length,
      totalLoad: outletLoad,
      description: `${circuitsNeeded} outlet circuit${circuitsNeeded > 1 ? 's' : ''} (${amperage}A)`
    });
  }
  
  // Dedicated appliance circuits
  appliances.forEach(appliance => {
    const load = calculateComponentLoad(appliance);
    const requiredAmperage = Math.ceil((load / 120) * 1.25); // 125% for continuous loads
    const recommendedBreaker = BREAKER_SIZES.find(size => size >= requiredAmperage) || 50;
    
    recommendations.push({
      type: 'dedicated',
      circuits: 1,
      amperage: recommendedBreaker,
      components: 1,
      totalLoad: load,
      applianceType: appliance.properties?.appliance_type || 'appliance',
      description: `Dedicated ${recommendedBreaker}A circuit for ${appliance.label || appliance.type}`
    });
  });
  
  return recommendations;
}

/**
 * Calculate whole-house load analysis with demand factors
 * @param {Array} allComponents - All components in the house
 * @param {Array} rooms - All rooms
 * @returns {Object} Whole house load analysis
 */
export function calculateWholeHouseLoad(allComponents, rooms) {
  // Calculate total loads by category
  const lightingComponents = allComponents.filter(c => c.type === 'light');
  const outletComponents = allComponents.filter(c => c.type === 'outlet');
  const applianceComponents = allComponents.filter(c => c.type === 'appliance');
  
  const totalLightingLoad = lightingComponents.reduce((sum, c) => sum + calculateComponentLoad(c), 0);
  const totalOutletLoad = outletComponents.reduce((sum, c) => sum + calculateComponentLoad(c), 0);
  const totalApplianceLoad = applianceComponents.reduce((sum, c) => sum + calculateComponentLoad(c), 0);
  
  // Apply NEC demand factors
  const lightingDemand = applyDemandFactor(totalLightingLoad, DEMAND_FACTORS.lighting);
  const outletDemand = applyDemandFactor(totalOutletLoad, DEMAND_FACTORS.outlets);
  const applianceDemand = calculateApplianceDemand(applianceComponents);
  
  const totalDemandLoad = lightingDemand + outletDemand + applianceDemand;
  const totalConnectedLoad = totalLightingLoad + totalOutletLoad + totalApplianceLoad;
  
  // Service size recommendation
  const recommendedServiceSize = getRecommendedServiceSize(totalDemandLoad);
  
  return {
    connectedLoad: {
      lighting: totalLightingLoad,
      outlets: totalOutletLoad,
      appliances: totalApplianceLoad,
      total: totalConnectedLoad
    },
    demandLoad: {
      lighting: lightingDemand,
      outlets: outletDemand,
      appliances: applianceDemand,
      total: totalDemandLoad
    },
    diversityFactor: ((totalConnectedLoad - totalDemandLoad) / totalConnectedLoad * 100).toFixed(1),
    recommendedServiceSize,
    componentCounts: {
      lights: lightingComponents.length,
      outlets: outletComponents.length,
      appliances: applianceComponents.length,
      total: allComponents.length
    },
    roomAnalysis: calculateRoomLoads(rooms, allComponents)
  };
}

/**
 * Apply demand factors according to NEC
 * @param {number} load - Total connected load
 * @param {Object} factors - Demand factor rules
 * @returns {number} Load with demand factors applied
 */
function applyDemandFactor(load, factors) {
  if (factors.first_3000 !== undefined) {
    // Lighting calculation
    const first3000 = Math.min(load, 3000) * factors.first_3000;
    const remainder = Math.max(load - 3000, 0) * factors.remainder;
    return first3000 + remainder;
  } else if (factors.first_10000 !== undefined) {
    // Outlet calculation
    const first10000 = Math.min(load, 10000) * factors.first_10000;
    const remainder = Math.max(load - 10000, 0) * factors.remainder;
    return first10000 + remainder;
  }
  return load;
}

/**
 * Calculate appliance demand using NEC rules
 * @param {Array} appliances - Array of appliance components
 * @returns {number} Demand load for appliances
 */
function calculateApplianceDemand(appliances) {
  if (appliances.length === 0) return 0;
  
  // Sort by load (highest first)
  const sortedLoads = appliances
    .map(a => calculateComponentLoad(a))
    .sort((a, b) => b - a);
  
  let demandLoad = 0;
  
  sortedLoads.forEach((load, index) => {
    if (index === 0) {
      demandLoad += load * DEMAND_FACTORS.appliances.first_appliance;
    } else if (index === 1) {
      demandLoad += load * DEMAND_FACTORS.appliances.second_appliance;
    } else {
      demandLoad += load * DEMAND_FACTORS.appliances.additional;
    }
  });
  
  return demandLoad;
}

/**
 * Get recommended electrical service size
 * @param {number} demandLoad - Total demand load in watts
 * @returns {Object} Service recommendation
 */
function getRecommendedServiceSize(demandLoad) {
  const demandAmps = demandLoad / 240; // 240V service
  
  const serviceSizes = [
    { amps: 100, description: '100A Service - Small homes, basic loads' },
    { amps: 150, description: '150A Service - Medium homes, moderate electric loads' },
    { amps: 200, description: '200A Service - Large homes, significant electric loads' },
    { amps: 300, description: '300A Service - Very large homes, heavy electric loads' },
    { amps: 400, description: '400A Service - Mansion/commercial grade' }
  ];
  
  const recommended = serviceSizes.find(size => size.amps >= demandAmps * 1.25) || serviceSizes[serviceSizes.length - 1];
  
  return {
    demandAmps: Math.round(demandAmps),
    recommendedAmps: recommended.amps,
    description: recommended.description,
    utilizationPercent: Math.round((demandAmps / recommended.amps) * 100),
    adequate: demandAmps <= recommended.amps * 0.8 // 80% rule
  };
} 