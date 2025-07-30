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
  selectedCircuits = new Set() // For multi-select filtering
}) => {
  if (!visible || components.length === 0) {
    return null;
  }

  // Since filtering is now handled in ComponentMapping.js via getFilteredComponents(),
  // we just render the components we receive at full opacity
  return (
    <g className="electrical-component-layer">
      {components.map((component) => {
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
          />
        );
      })}
    </g>
  );
};

export default ElectricalComponentLayer;
