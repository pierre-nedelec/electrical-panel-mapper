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
  circuitFilter = null // null = show all, 'unassigned' = show only unassigned, circuit ID = show only that circuit
}) => {
  if (!visible || components.length === 0) {
    return null;
  }

  // Filter components based on circuit filter
  const getFilteredComponents = () => {
    if (!circuitFilter) {
      return components; // Show all
    }
    
    if (circuitFilter === 'unassigned') {
      return components.filter(component => !component.circuit_id);
    }
    
    // Show only components assigned to specific circuit
    return components.filter(component => component.circuit_id === circuitFilter);
  };

  const filteredComponents = getFilteredComponents();
  
  return (
    <g className="electrical-component-layer">
      {components.map((component) => {
        const isFiltered = filteredComponents.includes(component);
        
        return (
          <ElectricalComponent
            key={component.id}
            component={component}
            selected={selectedComponent?.id === component.id}
            onSelect={onComponentSelect}
            onDoubleClick={onComponentDoubleClick}
            onRightClick={onComponentRightClick}
            onMouseDown={onComponentMouseDown}
            editMode={editMode}
            scale={scale}
            circuits={circuits}
            dimmed={circuitFilter && !isFiltered} // Dim components not matching filter
          />
        );
      })}
    </g>
  );
};

export default ElectricalComponentLayer;
