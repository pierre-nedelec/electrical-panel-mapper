// src/components/electrical/ElectricalSymbolPalette.js
import React, { useState, useEffect } from 'react';
import { Box, Button, Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OutletIcon from '@mui/icons-material/Power';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import CableIcon from '@mui/icons-material/Cable';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import config from '../../config';

const ElectricalSymbolPalette = ({ onSelect, selected, size = "small" }) => {
  const [symbols, setSymbols] = useState([]);

  // Standard electrical symbols
  const defaultSymbols = [
    {
      id: 'outlet',
      name: 'Outlet',
      icon: OutletIcon,
      category: 'power',
      description: 'Standard duplex outlet',
      device_type_id: 2
    },
    {
      id: 'light',
      name: 'Light',
      icon: LightbulbIcon,
      category: 'lighting',
      description: 'Light fixture',
      device_type_id: 1
    },
    {
      id: 'switch',
      name: 'Switch',
      icon: ToggleOnIcon,
      category: 'controls',
      description: 'Light switch',
      device_type_id: 1
    },
    {
      id: 'appliance',
      name: 'Appliance',
      icon: LocalFireDepartmentIcon,
      category: 'appliances',
      description: 'Hardwired appliance',
      device_type_id: 4
    },
    {
      id: 'panel',
      name: 'Panel',
      icon: ElectricalServicesIcon,
      category: 'panel',
      description: 'Electrical panel',
      device_type_id: 1
    }
  ];

  useEffect(() => {
    // Fetch electrical symbols from backend
    const fetchSymbols = async () => {
      try {
        const response = await fetch(`${config.BACKEND_URL}/api/electrical/symbols`);
        if (response.ok) {
          const backendSymbols = await response.json();
          // Merge backend symbols with default symbols
          setSymbols(defaultSymbols);
        } else {
          setSymbols(defaultSymbols);
        }
      } catch (error) {
        console.warn('Failed to fetch symbols from backend, using defaults:', error);
        setSymbols(defaultSymbols);
      }
    };

    fetchSymbols();
  }, []);

  const handleSymbolSelect = (event, symbolId) => {
    if (symbolId !== null) {
      const symbol = symbols.find(s => s.id === symbolId);
      onSelect(symbol);
    } else {
      onSelect(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <ToggleButtonGroup
        value={selected?.id || null}
        exclusive
        onChange={handleSymbolSelect}
        size={size}
        orientation="horizontal"
        sx={{ flexWrap: 'wrap' }}
      >
        {symbols.map((symbol) => {
          const IconComponent = symbol.icon;
          return (
            <Tooltip key={symbol.id} title={symbol.description} arrow>
              <ToggleButton 
                value={symbol.id}
                sx={{ 
                  minWidth: 40,
                  aspectRatio: '1/1'
                }}
              >
                <IconComponent fontSize="small" />
              </ToggleButton>
            </Tooltip>
          );
        })}
      </ToggleButtonGroup>
    </Box>
  );
};

export default ElectricalSymbolPalette;
