// src/components/electrical/ElectricalComponentLayer.js
import React from 'react';
import ElectricalComponent from './ElectricalComponent';

const ElectricalComponentLayer = ({ 
  components = [], 
  selectedComponent, 
  onComponentSelect,
  onComponentDoubleClick,
  onComponentRightClick,
  onComponentMouseDown,
  editMode = false,
  visible = true,
  scale = 1,
  circuits = [],
  circuitFilter = null, // null = show all, 'unassigned' = show only unassigned, etc.
  selectedCircuits = new Set(), // For multi-select filtering
  hoveredCircuit = null // For hover highlighting
}) => {
  if (!visible || components.length === 0) {
    return null;
  }

  // Determine component opacity based on hover state
  const getComponentOpacity = (component) => {
    // If no circuit is being hovered, show all at full opacity
    if (!hoveredCircuit) {
      return 1.0;
    }
    
    // If hovering "unassigned" and component has no circuit, highlight it
    if (hoveredCircuit === 'unassigned' && !component.circuit_id) {
      return 1.0;
    }
    
    // If hovering a specific circuit and component matches, highlight it
    if (hoveredCircuit !== 'unassigned' && component.circuit_id === hoveredCircuit) {
      return 1.0;
    }
    
    // Otherwise, shade the component (make it semi-transparent)
    return 0.3;
  };

  return (
    <g className="electrical-component-layer">
      {components.map((component) => {
        const opacity = getComponentOpacity(component);
        
        return (
          <g key={component.id} style={{ opacity }}>
            <ElectricalComponent
              component={component}
              selected={selectedComponent?.id === component.id}
              onSelect={onComponentSelect}
              onDoubleClick={onComponentDoubleClick}
              onRightClick={onComponentRightClick}
              onMouseDown={onComponentMouseDown}
              editMode={editMode}
              scale={scale}
              circuits={circuits}
            />
          </g>
        );
      })}
    </g>
  );
};

export default ElectricalComponentLayer;
