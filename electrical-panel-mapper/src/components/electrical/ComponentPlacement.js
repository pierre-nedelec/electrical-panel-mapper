// src/components/electrical/ComponentPlacement.js
import React, { useState, useCallback } from 'react';

export const useComponentPlacement = (
  svgRef, 
  snapToGrid = true, 
  gridSize = 20,
  rooms = []
) => {
  const [previewComponent, setPreviewComponent] = useState(null);

  // Convert screen coordinates to SVG coordinates
  const getSVGPoint = useCallback((event) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    
    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
    return svgPoint;
  }, [svgRef]);

  // Snap coordinate to grid if enabled
  const snapToGridIfEnabled = useCallback((value, forceDisable = false) => {
    if (!snapToGrid || forceDisable) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Find which room contains a point
  const getRoomAtPoint = useCallback((point) => {
    return rooms.find(room => 
      point.x >= room.x && 
      point.x <= room.x + room.width &&
      point.y >= room.y && 
      point.y <= room.y + room.height
    );
  }, [rooms]);

  // Check if point is valid for component placement
  const isValidPlacement = useCallback((point, componentType) => {
    // Always allow placement (can add validation rules here)
    return true;
  }, []);

  // Handle mouse move for component preview
  const handleMouseMove = useCallback((event, selectedTool) => {
    if (!selectedTool) {
      setPreviewComponent(null);
      return;
    }

    const svgPoint = getSVGPoint(event);
    const snappedPoint = {
      x: snapToGridIfEnabled(svgPoint.x, event.shiftKey),
      y: snapToGridIfEnabled(svgPoint.y, event.shiftKey)
    };

    const room = getRoomAtPoint(snappedPoint);
    const valid = isValidPlacement(snappedPoint, selectedTool.id);

    setPreviewComponent({
      type: selectedTool.id,
      x: snappedPoint.x,
      y: snappedPoint.y,
      room_id: room?.id || null,
      valid
    });
  }, [getSVGPoint, snapToGridIfEnabled, getRoomAtPoint, isValidPlacement]);

  // Handle component placement
  const handlePlacement = useCallback((event, selectedTool, onComponentPlaced) => {
    if (!selectedTool || !previewComponent || !previewComponent.valid) {
      return;
    }

    // Set default properties for appliances
    const isAppliance = selectedTool.id === 'appliance';
    const defaultApplianceType = 'baseboard_heater';
    
    const getDefaultLabel = (toolId, applianceType) => {
      if (toolId === 'appliance') {
        switch (applianceType) {
          case 'baseboard_heater': return 'Baseboard Heater';
          case 'jacuzzi': return 'Jacuzzi';
          case 'hvac_unit': return 'HVAC Unit';
          case 'ceiling_fan': return 'Ceiling Fan';
          case 'electric_water_heater': return 'Water Heater';
          case 'electric_dryer': return 'Dryer';
          case 'electric_range': return 'Range/Oven';
          case 'dishwasher': return 'Dishwasher';
          case 'garbage_disposal': return 'Garbage Disposal';
          case 'refrigerator': return 'Refrigerator';
          case 'microwave': return 'Microwave';
          case 'air_conditioner': return 'Air Conditioner';
          case 'heat_pump': return 'Heat Pump';
          case 'floor_heating': return 'Floor Heating';
          default: return 'Appliance';
        }
      }
      return selectedTool.name;
    };

    const newComponent = {
      type: selectedTool.id,
      x: previewComponent.x,
      y: previewComponent.y,
      room_id: previewComponent.room_id,
      device_type_id: selectedTool.device_type_id || 1, // Default to first device type
      label: getDefaultLabel(selectedTool.id, isAppliance ? defaultApplianceType : null),
      properties: isAppliance ? { 
        appliance_type: defaultApplianceType,
        gfci: false,
        dedicated: false
      } : {}
    };

    if (onComponentPlaced) {
      onComponentPlaced(newComponent);
    }

    setPreviewComponent(null);
  }, [previewComponent]);

  // Clear preview
  const clearPreview = useCallback(() => {
    setPreviewComponent(null);
  }, []);

  return {
    previewComponent,
    handleMouseMove,
    handlePlacement,
    clearPreview,
    getSVGPoint,
    snapToGridIfEnabled,
    getRoomAtPoint
  };
};

// Component for rendering placement preview
export const ComponentPreview = ({ previewComponent }) => {
  if (!previewComponent) return null;

  const color = previewComponent.valid ? '#4caf50' : '#f44336';
  const opacity = 0.6;

  return (
    <g className="component-preview">
      <circle
        cx={previewComponent.x}
        cy={previewComponent.y}
        r="12"
        fill={color}
        opacity={opacity}
        stroke="white"
        strokeWidth="2"
      />
      <text
        x={previewComponent.x}
        y={previewComponent.y + 20}
        textAnchor="middle"
        fontSize="10"
        fill={color}
        fontWeight="bold"
      >
        {previewComponent.type}
      </text>
    </g>
  );
};

export default useComponentPlacement;
