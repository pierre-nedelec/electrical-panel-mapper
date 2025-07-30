import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Divider,
  Button,
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ElectricalServices as CircuitIcon,
  Lightbulb as LightIcon,
  Outlet as OutletIcon,
  Kitchen as ApplianceIcon,
  Merge as MergeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { calculateCircuitLoad, calculateComponentLoad, formatLoad } from '../../utils/loadCalculations';

const CircuitLoadRecap = ({ circuits = [], components = [], onCircuitMergeClick }) => {
  const [expandedCircuit, setExpandedCircuit] = useState(null);
  const [sortBy, setSortBy] = useState('load'); // 'load', 'utilization', 'position'

  // Calculate load data for each circuit
  const circuitAnalysis = useMemo(() => {
    const analysis = circuits.map(circuit => {
      // Get components for this circuit
      const circuitComponents = components.filter(c => c.circuit_id === circuit.id);
      
      // Calculate loads using actual component wattage and device types
      const loadData = calculateCircuitLoad(circuitComponents);
      const maxCapacity = (circuit.amperage || 20) * (circuit.voltage || 120);
      const utilization = maxCapacity > 0 ? (loadData.totalLoad / maxCapacity) * 100 : 0;
      
      // Categorize load level
      let loadLevel = 'light';
      if (utilization > 60) loadLevel = 'moderate';
      if (utilization > 80) loadLevel = 'heavy';
      
      return {
        ...circuit,
        ...loadData,
        maxCapacity,
        utilization,
        loadLevel,
        components: circuitComponents,
        // Additional debugging info
        _debug: {
          componentCount: circuitComponents.length,
          componentWattages: circuitComponents.map(c => ({ id: c.id, label: c.label, wattage: c.wattage }))
        }
      };
    });

    // Add unassigned components as a virtual circuit - ENHANCED
    const unassignedComponents = components.filter(c => !c.circuit_id || c.circuit_id === null || c.circuit_id === '');
    if (unassignedComponents.length > 0) {
      const unassignedLoad = calculateCircuitLoad(unassignedComponents);
      const totalUnassignedWattage = unassignedComponents.reduce((sum, c) => sum + (c.wattage || 0), 0);
      
      analysis.push({
        id: 'unassigned',
        circuit_label: `Unassigned Components (${unassignedComponents.length})`,
        breaker_position: '—',
        amperage: 20,
        voltage: 120,
        ...unassignedLoad,
        maxCapacity: 20 * 120,
        utilization: 0, // Unassigned doesn't have circuit utilization
        loadLevel: 'unassigned',
        components: unassignedComponents,
        // Show total wattage for unassigned
        _debug: {
          componentCount: unassignedComponents.length,
          totalWattage: totalUnassignedWattage,
          componentWattages: unassignedComponents.map(c => ({ 
            id: c.id, 
            label: c.label || c.type, 
            wattage: c.wattage || 0,
            type: c.type 
          }))
        }
      });
    }

    // Sort circuits
    return analysis.sort((a, b) => {
      switch (sortBy) {
        case 'load':
          return b.totalLoad - a.totalLoad;
        case 'utilization':
          // Always put unassigned at the end
          if (a.id === 'unassigned') return 1;
          if (b.id === 'unassigned') return -1;
          return b.utilization - a.utilization;
        case 'position':
          if (a.id === 'unassigned') return 1;
          if (b.id === 'unassigned') return -1;
          return (a.breaker_position || 0) - (b.breaker_position || 0);
        default:
          return 0;
      }
    });
  }, [circuits, components, sortBy]);

  const getLoadLevelColor = (level) => {
    switch (level) {
      case 'light': return 'success';
      case 'moderate': return 'warning';
      case 'heavy': return 'error';
      case 'unassigned': return 'info';
      default: return 'default';
    }
  };

  const getLoadLevelLabel = (level, utilization) => {
    switch (level) {
      case 'light': return `Light (${utilization.toFixed(0)}%)`;
      case 'moderate': return `Moderate (${utilization.toFixed(0)}%)`;
      case 'heavy': return `Heavy (${utilization.toFixed(0)}%)`;
      case 'unassigned': return 'Unassigned';
      default: return 'Unknown';
    }
  };

  const getComponentIcon = (type) => {
    switch (type) {
      case 'light': return <LightIcon sx={{ fontSize: 16 }} />;
      case 'outlet': return <OutletIcon sx={{ fontSize: 16 }} />;
      case 'appliance': return <ApplianceIcon sx={{ fontSize: 16 }} />;
      default: return <CircuitIcon sx={{ fontSize: 16 }} />;
    }
  };

  // Find lightly loaded circuits that could be merged
  const lightlyLoadedCircuits = circuitAnalysis.filter(c => 
    c.id !== 'unassigned' && c.loadLevel === 'light' && c.utilization < 40
  );

  const handleToggleExpand = (circuitId) => {
    setExpandedCircuit(expandedCircuit === circuitId ? null : circuitId);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircuitIcon />
          Circuit Load Analysis
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={sortBy === 'load' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('load')}
          >
            By Load
          </Button>
          <Button
            size="small"
            variant={sortBy === 'utilization' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('utilization')}
          >
            By Usage
          </Button>
          <Button
            size="small"
            variant={sortBy === 'position' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('position')}
          >
            By Position
          </Button>
        </Box>
      </Box>

      {/* Merge Suggestion */}
      {lightlyLoadedCircuits.length >= 2 && (
        <Card sx={{ mb: 2, backgroundColor: 'info.50', borderLeft: '4px solid', borderColor: 'info.main' }}>
          <CardContent sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MergeIcon color="info" />
              <Typography variant="body2">
                <strong>Merger Opportunity:</strong> {lightlyLoadedCircuits.length} lightly loaded circuits could potentially be combined to free up breaker space.
              </Typography>
              {onCircuitMergeClick && (
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  onClick={() => onCircuitMergeClick(lightlyLoadedCircuits)}
                >
                  Analyze
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Circuit List */}
      <List dense>
        {circuitAnalysis.map((circuit) => (
          <Card key={circuit.id} sx={{ mb: 1 }} variant="outlined">
            <ListItem
              button
              onClick={() => handleToggleExpand(circuit.id)}
              sx={{ flexDirection: 'column', alignItems: 'stretch' }}
            >
              {/* Circuit Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {circuit.id === 'unassigned' ? <WarningIcon color="warning" /> : <CircuitIcon />}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {circuit.id === 'unassigned' ? 'Unassigned' : `Circuit ${circuit.breaker_position}`}
                      </Typography>
                      <Chip
                        size="small"
                        label={circuit.id === 'unassigned' ? `${circuit.componentCount} items` : `${circuit.amperage}A`}
                        color={circuit.id === 'unassigned' ? 'warning' : 'default'}
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2">
                          {formatLoad(circuit.totalLoad)} / {formatLoad(circuit.maxCapacity)}
                        </Typography>
                        <Chip
                          size="small"
                          label={getLoadLevelLabel(circuit.loadLevel, circuit.utilization)}
                          color={getLoadLevelColor(circuit.loadLevel)}
                        />
                      </Box>
                      {circuit.id !== 'unassigned' && (
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(circuit.utilization, 100)}
                          color={getLoadLevelColor(circuit.loadLevel)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      )}
                    </Box>
                  }
                />
                
                <IconButton size="small">
                  {expandedCircuit === circuit.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              {/* Expanded Component Details */}
              <Collapse in={expandedCircuit === circuit.id} sx={{ width: '100%' }}>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ pl: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Components ({circuit.componentCount}):
                  </Typography>
                  
                  {circuit.components.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No components assigned to this circuit
                    </Typography>
                  ) : (
                    <List sx={{ mt: 1 }}>
                      {circuit.components.map((component, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, px: 1 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            {getComponentIcon(component.type)}
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Typography variant="body2">
                                {component.label || `${component.type} ${component.id}`}
                                {circuit.id === 'unassigned' && (
                                  <Chip 
                                    label="Needs Circuit" 
                                    size="small" 
                                    color="warning" 
                                    sx={{ ml: 1, fontSize: '0.6rem', height: 16 }} 
                                  />
                                )}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="textSecondary">
                                {formatLoad(calculateComponentLoad(component))} 
                                {component.room_id && ` • Room ${component.room_id}`}
                                {component.wattage > 0 && ` • ${component.wattage}W`}
                                {component.type === 'appliance' && component.properties?.appliance_type && 
                                  ` • ${component.properties.appliance_type.replace('_', ' ')}`
                                }
                              </Typography>
                            }
                          />
                          {circuit.id === 'unassigned' && (
                            <Tooltip title="Click to assign to circuit">
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  // Could open assignment dialog here
                                  console.log('Assign component to circuit:', component.id);
                                }}
                              >
                                <MergeIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  )}
                  
                  {/* Load Breakdown */}
                  {circuit.totalLoad > 0 && (
                    <Box sx={{ mt: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" display="block" gutterBottom>
                        Load Breakdown:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {circuit.lightingLoad > 0 && (
                          <Typography variant="caption">
                            Lighting: {formatLoad(circuit.lightingLoad)}
                          </Typography>
                        )}
                        {circuit.outletLoad > 0 && (
                          <Typography variant="caption">
                            Outlets: {formatLoad(circuit.outletLoad)}
                          </Typography>
                        )}
                        {circuit.applianceLoad > 0 && (
                          <Typography variant="caption">
                            Appliances: {formatLoad(circuit.applianceLoad)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </ListItem>
          </Card>
        ))}
      </List>

      {circuitAnalysis.length === 0 && (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <CircuitIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              No circuits found. Add electrical panels and circuits to see load analysis.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CircuitLoadRecap;
