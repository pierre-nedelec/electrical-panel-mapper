import React, { useState } from 'react';

/**
 * Simple panel icon for floor plan placement
 * Detailed panel view will be shown in sidebar when selected
 */
const PanelVisualization = ({ 
  panel, 
  circuits = [], 
  selected = false,
  onSelect,
  onDoubleClick 
}) => {
  const [hovered, setHovered] = useState(false);

  // Small icon dimensions for floor plan
  const iconSize = 24;
  const circuitCount = circuits.length;
  const maxCircuits = panel.total_positions || 30;

  return (
    <g 
      transform={`translate(${panel.x_position || 0}, ${panel.y_position || 0})`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Panel icon background */}
      <rect
        x="0"
        y="0"
        width={iconSize}
        height={iconSize}
        fill="#f5f5f5"
        stroke={selected ? "#1976d2" : hovered ? "#666" : "#333"}
        strokeWidth={selected ? "2" : "1"}
        rx="2"
      />
      
      {/* Panel symbol - electrical panel icon */}
      <rect
        x="3"
        y="3"
        width={iconSize - 6}
        height="4"
        fill="#FF5722"
        rx="1"
      />
      
      {/* Breaker representation - small lines */}
      <g stroke="#333" strokeWidth="1">
        <line x1="4" y1="10" x2="8" y2="10" />
        <line x1="10" y1="10" x2="14" y2="10" />
        <line x1="16" y1="10" x2="20" y2="10" />
        
        <line x1="4" y1="13" x2="8" y2="13" />
        <line x1="10" y1="13" x2="14" y2="13" />
        <line x1="16" y1="13" x2="20" y2="13" />
        
        <line x1="4" y1="16" x2="8" y2="16" />
        <line x1="10" y1="16" x2="14" y2="16" />
        <line x1="16" y1="16" x2="20" y2="16" />
        
        <line x1="4" y1="19" x2="8" y2="19" />
        <line x1="10" y1="19" x2="14" y2="19" />
        <line x1="16" y1="19" x2="20" y2="19" />
      </g>
      
      {/* Panel label */}
      <text
        x={iconSize / 2}
        y={iconSize + 12}
        textAnchor="middle"
        fontSize="8"
        fill="#333"
        style={{ pointerEvents: 'none' }}
      >
        {panel.panel_name || 'Panel'}
      </text>
      
      {/* Circuit count indicator */}
      <circle
        cx={iconSize - 4}
        cy="4"
        r="6"
        fill="#4CAF50"
        stroke="white"
        strokeWidth="1"
      />
      <text
        x={iconSize - 4}
        y="6"
        textAnchor="middle"
        fontSize="6"
        fill="white"
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {circuitCount}
      </text>
      
      {/* Selection indicator */}
      {selected && (
        <rect
          x="-2"
          y="-2"
          width={iconSize + 4}
          height={iconSize + 4}
          fill="none"
          stroke="#1976d2"
          strokeWidth="2"
          strokeDasharray="3,3"
          rx="4"
        />
      )}
      
      {/* Hover tooltip */}
      {hovered && (
        <g>
          <rect
            x={iconSize + 5}
            y="-5"
            width="100"
            height="35"
            fill="rgba(0,0,0,0.9)"
            stroke="#666"
            strokeWidth="1"
            rx="3"
          />
          <text
            x={iconSize + 10}
            y="5"
            fontSize="9"
            fill="white"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {panel.panel_name || 'Electrical Panel'}
          </text>
          <text
            x={iconSize + 10}
            y="15"
            fontSize="7"
            fill="#ccc"
            style={{ pointerEvents: 'none' }}
          >
            {panel.main_breaker_amps || 200}A Main
          </text>
          <text
            x={iconSize + 10}
            y="24"
            fontSize="7"
            fill="#ccc"
            style={{ pointerEvents: 'none' }}
          >
            {circuitCount}/{maxCircuits} circuits
          </text>
        </g>
      )}
    </g>
  );
};

/**
 * Detailed panel view for sidebar/dialog
 * Shows full breaker schedule and circuit details
 */
export const DetailedPanelView = ({ 
  panel, 
  circuits = [], 
  onCircuitSelect 
}) => {
  const maxBreakers = panel.total_positions || 30;
  const breakersPerSide = Math.ceil(maxBreakers / 2);
  
  // Get circuit for a specific breaker position
  const getCircuitForBreaker = (position) => {
    return circuits.find(circuit => circuit.breaker_position === position);
  };

  return (
    <div style={{ 
      width: '300px', 
      border: '1px solid #ddd', 
      borderRadius: '4px',
      backgroundColor: 'white',
      padding: '10px'
    }}>
      {/* Panel header */}
      <div style={{ 
        textAlign: 'center', 
        padding: '8px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        marginBottom: '10px'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {panel.panel_name || 'Main Panel'}
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Main Breaker: {panel.main_breaker_amps || 200}A
        </div>
      </div>

      {/* Breaker schedule */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        fontSize: '10px'
      }}>
        {/* Left column (odd numbers) */}
        <div style={{ width: '48%' }}>
          {Array.from({ length: breakersPerSide }, (_, i) => {
            const position = (i * 2) + 1;
            const circuit = getCircuitForBreaker(position);
            return (
              <div 
                key={position}
                onClick={() => circuit && onCircuitSelect?.(circuit)}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  cursor: circuit ? 'pointer' : 'default',
                  backgroundColor: circuit ? (circuit.color_code || '#4CAF50') : '#f9f9f9',
                  color: circuit ? 'white' : '#666',
                  marginBottom: '1px',
                  borderRadius: '2px'
                }}
              >
                <span style={{ width: '20px', fontWeight: 'bold' }}>{position}</span>
                <span style={{ width: '25px' }}>{circuit?.amperage || ''}A</span>
                <span style={{ flex: 1, fontSize: '9px' }}>
                  {circuit?.circuit_label || (circuit ? 'Unlabeled' : 'Spare')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right column (even numbers) */}
        <div style={{ width: '48%' }}>
          {Array.from({ length: breakersPerSide }, (_, i) => {
            const position = (i * 2) + 2;
            if (position > maxBreakers) return null;
            
            const circuit = getCircuitForBreaker(position);
            return (
              <div 
                key={position}
                onClick={() => circuit && onCircuitSelect?.(circuit)}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  cursor: circuit ? 'pointer' : 'default',
                  backgroundColor: circuit ? (circuit.color_code || '#4CAF50') : '#f9f9f9',
                  color: circuit ? 'white' : '#666',
                  marginBottom: '1px',
                  borderRadius: '2px'
                }}
              >
                <span style={{ width: '20px', fontWeight: 'bold' }}>{position}</span>
                <span style={{ width: '25px' }}>{circuit?.amperage || ''}A</span>
                <span style={{ flex: 1, fontSize: '9px' }}>
                  {circuit?.circuit_label || (circuit ? 'Unlabeled' : 'Spare')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PanelVisualization; 