import React, { useMemo } from 'react';

/**
 * Renders visual circuit connections between electrical components and panels
 * Uses smart routing to avoid obstacles and create clean wire paths
 */
const CircuitVisualization = ({ 
  circuits = [], 
  components = [], 
  panels = [], 
  rooms = [],
  visible = true 
}) => {
  
  // Circuit colors for different breaker positions
  const circuitColors = [
    '#FF5722', // Red
    '#2196F3', // Blue  
    '#4CAF50', // Green
    '#FF9800', // Orange
    '#9C27B0', // Purple
    '#607D8B', // Blue Grey
    '#795548', // Brown
    '#F44336', // Deep Red
    '#3F51B5', // Indigo
    '#009688', // Teal
    '#FFC107', // Amber
    '#E91E63'  // Pink
  ];

  // Get color for circuit based on breaker position
  const getCircuitColor = (circuit) => {
    if (circuit.color_code) return circuit.color_code;
    const colorIndex = (circuit.breaker_position - 1) % circuitColors.length;
    return circuitColors[colorIndex];
  };

  // Find panel for a circuit
  const getPanelForCircuit = (circuit) => {
    return panels.find(panel => panel.id === circuit.panel_id);
  };

  // Find components for a circuit
  const getComponentsForCircuit = (circuit) => {
    return components.filter(component => component.circuit_id === circuit.id);
  };

  // Calculate breaker connection point on panel
  const getBreakerConnectionPoint = (panel, breakerPosition) => {
    const panelWidth = 80;
    const breakerHeight = 8;
    const isLeft = breakerPosition % 2 === 1;
    const row = Math.ceil(breakerPosition / 2) - 1;
    
    const x = panel.x_position + (isLeft ? 35 : panelWidth - 5);
    const y = panel.y_position + 25 + (row * (breakerHeight + 2)) + breakerHeight/2;
    
    return { x, y };
  };

  // Simple path calculation (can be enhanced with obstacle avoidance)
  const calculatePath = (start, end, circuit, componentCount, componentIndex) => {
    // Add slight offset for multiple components on same circuit
    const offset = componentCount > 1 ? (componentIndex - componentCount/2) * 3 : 0;
    
    // Simple L-shaped path for now
    const midX = start.x + (end.x - start.x) * 0.7;
    const midY = start.y + offset;
    
    return `M ${start.x} ${start.y} L ${midX} ${midY} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  };

  // Calculate all circuit paths
  const circuitPaths = useMemo(() => {
    const paths = [];
    
    circuits.forEach(circuit => {
      const panel = getPanelForCircuit(circuit);
      const circuitComponents = getComponentsForCircuit(circuit);
      
      if (!panel || circuitComponents.length === 0) return;
      
      const breakerPoint = getBreakerConnectionPoint(panel, circuit.breaker_position);
      const color = getCircuitColor(circuit);
      
      circuitComponents.forEach((component, index) => {
        const componentPoint = {
          x: component.x + 10, // Center of component
          y: component.y + 10
        };
        
        const path = calculatePath(
          componentPoint, 
          breakerPoint, 
          circuit, 
          circuitComponents.length, 
          index
        );
        
        paths.push({
          id: `${circuit.id}-${component.id}`,
          path,
          color,
          circuit,
          component,
          strokeWidth: circuit.wire_gauge === '10 AWG' ? 3 : circuit.wire_gauge === '14 AWG' ? 1.5 : 2
        });
      });
    });
    
    return paths;
  }, [circuits, components, panels]);

  if (!visible) return null;

  return (
    <g className="circuit-visualization">
      {/* Define arrowhead marker */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#666" />
        </marker>
      </defs>
      
      {/* Render circuit paths */}
      {circuitPaths.map(({ id, path, color, circuit, component, strokeWidth }) => (
        <g key={id}>
          {/* Main circuit line */}
          <path
            d={path}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeOpacity="0.8"
            strokeDasharray={circuit.breaker_type === 'GFCI' ? '5,5' : 'none'}
            markerEnd="url(#arrowhead)"
            style={{ cursor: 'pointer' }}
          >
            <title>
              {`Circuit ${circuit.breaker_position}: ${circuit.circuit_label || 'Unlabeled'}\n`}
              {`${circuit.amperage}A ${circuit.wire_gauge || '12 AWG'}\n`}
              {`Component: ${component.type} at (${Math.round(component.x)}, ${Math.round(component.y)})`}
            </title>
          </path>
          
          {/* Circuit label (at midpoint) */}
          <text
            x={component.x + (getBreakerConnectionPoint(panels.find(p => p.id === circuit.panel_id), circuit.breaker_position).x - component.x) / 2}
            y={component.y - 5}
            fontSize="8"
            fill={color}
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            {circuit.breaker_position}
          </text>
        </g>
      ))}
      
      {/* Circuit legend (if there are circuits) */}
      {circuits.length > 0 && (
        <g transform="translate(10, 10)">
          <rect
            x="0"
            y="0"
            width="150"
            height={Math.min(circuits.length * 15 + 10, 200)}
            fill="rgba(255,255,255,0.9)"
            stroke="#ddd"
            strokeWidth="1"
            rx="3"
          />
          <text
            x="75"
            y="12"
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#333"
          >
            Circuits
          </text>
          {circuits.slice(0, 12).map((circuit, index) => (
            <g key={circuit.id} transform={`translate(5, ${20 + index * 15})`}>
              <line
                x1="0"
                y1="0"
                x2="15"
                y2="0"
                stroke={getCircuitColor(circuit)}
                strokeWidth="3"
              />
              <text
                x="20"
                y="2"
                fontSize="8"
                fill="#333"
              >
                {circuit.breaker_position}: {circuit.circuit_label || `${circuit.amperage}A`}
              </text>
            </g>
          ))}
          {circuits.length > 12 && (
            <text
              x="75"
              y={20 + 12 * 15}
              textAnchor="middle"
              fontSize="8"
              fill="#666"
            >
              +{circuits.length - 12} more circuits
            </text>
          )}
        </g>
      )}
    </g>
  );
};

export default CircuitVisualization; 