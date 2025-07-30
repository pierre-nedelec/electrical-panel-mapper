// src/components/electrical/ElectricalComponent.js
import React from 'react';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OutletIcon from '@mui/icons-material/Power';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
// Appliance icons
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HotTubIcon from '@mui/icons-material/HotTub';
import AirIcon from '@mui/icons-material/Air';
import WaterIcon from '@mui/icons-material/Water';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import KitchenIcon from '@mui/icons-material/Kitchen';
import DeleteIcon from '@mui/icons-material/Delete';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import FloorIcon from '@mui/icons-material/Foundation';
import { getComponentType, getApplianceType } from '../../utils/deviceTypeMapping';

const ElectricalComponent = ({ 
  component, 
  selected = false, 
  onSelect, 
  onDoubleClick,
  onRightClick,
  onMouseDown,
  editMode = false,
  scale = 1,
  circuits = [],
  dimmed = false
}) => {
  const getDefaultName = (type, applianceType) => {
    switch (type) {
      case 'outlet': return 'Outlet';
      case 'light': return 'Light';
      case 'switch': return 'Switch';
      case 'panel': return 'Panel';
      case 'appliance':
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
      default: return 'Component';
    }
  };

  const getIconComponent = (type, applianceType) => {
    switch (type) {
      case 'outlet': return OutletIcon;
      case 'light': return LightbulbIcon;
      case 'switch': return ToggleOnIcon;
      case 'panel': return ElectricalServicesIcon;
      case 'appliance':
        switch (applianceType) {
          case 'baseboard_heater': return ThermostatIcon;
          case 'jacuzzi': return HotTubIcon;
          case 'hvac_unit': return AirIcon;
          case 'ceiling_fan': return AirIcon;
          case 'electric_water_heater': return WaterIcon;
          case 'electric_dryer': return LocalLaundryServiceIcon;
          case 'electric_range': return KitchenIcon;
          case 'dishwasher': return KitchenIcon;
          case 'garbage_disposal': return DeleteIcon;
          case 'refrigerator': return AcUnitIcon;
          case 'microwave': return KitchenIcon;
          case 'air_conditioner': return AcUnitIcon;
          case 'heat_pump': return LocalFireDepartmentIcon;
          case 'floor_heating': return FloorIcon;
          default: return LocalFireDepartmentIcon; // Default appliance icon
        }
      default: return OutletIcon;
    }
  };

  // Determine component type and appliance type from device_type_id
  const componentType = component.device_type_id ? getComponentType(component.device_type_id) : (component.type || 'outlet');
  const applianceType = componentType === 'appliance' ? getApplianceType(component.device_type_id) : (component.properties?.appliance_type || 'baseboard_heater');

  // Get circuit for this component
  const assignedCircuit = circuits.find(c => c.id === component.circuit_id);
  
  // Circuit colors (consistent with circuit visualization)
  const circuitColors = [
    '#FF5722', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', 
    '#607D8B', '#795548', '#F44336', '#3F51B5', '#009688', 
    '#FFC107', '#E91E63'
  ];
  
  const getCircuitColor = (circuit) => {
    if (circuit?.color_code) return circuit.color_code;
    if (circuit?.breaker_position) {
      const colorIndex = (circuit.breaker_position - 1) % circuitColors.length;
      return circuitColors[colorIndex];
    }
    return '#666666';
  };

  const getSymbolColor = (type, selected) => {
    if (selected) return '#1976d2';
    
    // Use circuit color if component is assigned to a circuit
    if (assignedCircuit) {
      return getCircuitColor(assignedCircuit);
    }
    
    // Default colors for unassigned components (muted)
    switch (type) {
      case 'outlet': return '#ffcc80';
      case 'light': return '#fff59d';
      case 'switch': return '#a5d6a7';
      case 'panel': return '#ce93d8';
      case 'appliance': return '#ff8a65'; // Orange for appliances
      default: return '#bdbdbd';
    }
  };

  const handleClick = (event) => {
    event.stopPropagation();
    if (onSelect) {
      onSelect(component);
    }
  };

  const handleDoubleClick = (event) => {
    event.stopPropagation();
    if (onDoubleClick) {
      onDoubleClick(component);
    }
  };

  const handleRightClick = (event) => {
    event.stopPropagation();
    if (onRightClick) {
      onRightClick(event, component);
    }
  };

  const handleMouseDown = (event) => {
    if (onMouseDown) {
      onMouseDown(event, component);
    }
  };

  const size = 16 * scale;
  const strokeWidth = selected ? 3 : 2;
  const opacity = dimmed ? 0.3 : 1;

  return (
    <g 
      className="electrical-component"
      data-component-id={component.id}
      style={{ cursor: editMode ? (selected ? 'move' : 'pointer') : 'pointer' }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      onMouseDown={handleMouseDown}
      opacity={opacity}
    >
      {/* Component background circle */}
      <circle
        cx={component.x}
        cy={component.y}
        r={size / 2 + 2}
        fill="white"
        stroke={getSymbolColor(componentType, selected)}
        strokeWidth={strokeWidth}
        opacity={selected ? 0.9 : 0.7}
      />
      
      {/* Component icon */}
      <foreignObject
        x={component.x - size / 2}
        y={component.y - size / 2}
        width={size}
        height={size}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: getSymbolColor(componentType, selected)
        }}>
          {React.createElement(getIconComponent(componentType, applianceType), {
            style: { fontSize: size * 0.7 }
          })}
        </div>
      </foreignObject>
      
      {/* Circuit indicator badge */}
      {assignedCircuit && (
        <g>
          <circle
            cx={component.x + size / 2 - 2}
            cy={component.y - size / 2 + 2}
            r="6"
            fill={getCircuitColor(assignedCircuit)}
            stroke="white"
            strokeWidth="1"
          />
          <text
            x={component.x + size / 2 - 2}
            y={component.y - size / 2 + 4}
            textAnchor="middle"
            fontSize="6"
            fill="white"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {assignedCircuit.breaker_position || '?'}
          </text>
        </g>
      )}
      
      {/* Unassigned indicator */}
      {!assignedCircuit && (
        <g>
          <circle
            cx={component.x + size / 2 - 2}
            cy={component.y - size / 2 + 2}
            r="4"
            fill="#f44336"
            stroke="white"
            strokeWidth="1"
          />
          <text
            x={component.x + size / 2 - 2}
            y={component.y - size / 2 + 3}
            textAnchor="middle"
            fontSize="8"
            fill="white"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            !
          </text>
        </g>
      )}
      
      {/* Component label */}
      {(selected || scale > 0.8) && (
        <text
          x={component.x}
          y={component.y + size / 2 + 12}
          textAnchor="middle"
          fontSize="10"
          fill={selected ? '#1976d2' : '#666666'}
          fontWeight={selected ? 'bold' : 'normal'}
          style={{ pointerEvents: 'none' }}
        >
          {component.label || getDefaultName(componentType, applianceType)}
        </text>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <circle
          cx={component.x}
          cy={component.y}
          r={size / 2 + 8}
          fill="none"
          stroke="#1976d2"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity={0.7}
        />
      )}
    </g>
  );
};

export default ElectricalComponent;
