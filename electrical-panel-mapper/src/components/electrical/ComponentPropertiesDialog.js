import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Box,
  Typography,
  Chip,
  FormControlLabel,
  Checkbox,
  LinearProgress
} from '@mui/material';
import { 
  calculateCircuitCapacity, 
  formatLoad, 
  getLoadColor,
  calculateComponentLoad 
} from '../../utils/loadCalculations';

const ComponentPropertiesDialog = ({ 
  open, 
  onClose, 
  onSave, 
  component, 
  rooms = [], 
  circuits = [],
  components = [], // All electrical components to calculate circuit loads
  getComponentRoom // Function to determine room from position
}) => {
  const [formData, setFormData] = useState({
    label: '',
    type: 'outlet',
    voltage: 120,
    amperage: 20,
    room_id: '',
    circuit_id: '',
    notes: '',
    // Component-specific properties
    gfci: false,
    dedicated: false,
    switched: false,
    appliance_type: 'baseboard_heater' // Default appliance type
  });

  useEffect(() => {
    if (component) {
      // Automatically determine room based on component position
      const currentRoom = getComponentRoom ? getComponentRoom(component.x, component.y) : null;
      
      setFormData({
        label: component.label || '',
        type: component.type || 'outlet',
        voltage: component.voltage || 120,
        amperage: component.amperage || 20,
        room_id: currentRoom?.id || component.room_id || '',
        circuit_id: component.circuit_id || '',
        notes: component.notes || '',
        gfci: component.gfci || false,
        dedicated: component.dedicated || false,
        switched: component.switched || false,
        appliance_type: component.appliance_type || component.properties?.appliance_type || 'baseboard_heater'
      });
    }
  }, [component, getComponentRoom]);

  const getDefaultApplianceName = (applianceType) => {
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
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [field]: value
      };

      // Auto-update label for appliances when appliance type changes
      if (field === 'appliance_type' && prev.type === 'appliance') {
        // Only update if current label is a default appliance name or empty
        const isDefaultLabel = !prev.label || 
          prev.label === 'Appliance' || 
          prev.label === getDefaultApplianceName(prev.appliance_type);
        
        if (isDefaultLabel) {
          newFormData.label = getDefaultApplianceName(value);
        }
      }

      return newFormData;
    });
  };

  const handleSave = () => {
    const updatedComponent = {
      ...component,
      ...formData,
      // Store appliance-specific properties in a properties object
      properties: {
        ...component?.properties,
        appliance_type: formData.appliance_type,
        gfci: formData.gfci,
        dedicated: formData.dedicated,
        switched: formData.switched
      },
      // Ensure position data is preserved
      x: component?.x,
      y: component?.y
    };
    onSave(updatedComponent);
    onClose();
  };

  const getComponentTypeLabel = (type) => {
    const types = {
      outlet: 'Outlet',
      light: 'Light Fixture',
      switch: 'Switch',
      panel: 'Electrical Panel',
      appliance: 'Appliance'
    };
    return types[type] || type;
  };

  const getAmperageOptions = () => {
    // Only used for outlets now
    return [15, 20]; // Standard outlet ratings
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit {getComponentTypeLabel(formData.type)} Properties
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Compact Layout */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Label"
              sx={{ flex: 2 }}
              value={formData.label}
              onChange={(e) => handleChange('label', e.target.value)}
              placeholder="e.g., Kitchen Counter"
              size="small"
            />

            <FormControl sx={{ flex: 1 }} size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                label="Type"
              >
                <MenuItem value="outlet">Outlet</MenuItem>
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="switch">Switch</MenuItem>
                <MenuItem value="appliance">Appliance</MenuItem>
                <MenuItem value="panel">Panel</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Appliance Type Selection - Only show for appliances */}
          {formData.type === 'appliance' && (
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>Appliance Type</InputLabel>
                <Select
                  value={formData.appliance_type}
                  onChange={(e) => handleChange('appliance_type', e.target.value)}
                  label="Appliance Type"
                >
                  <MenuItem value="baseboard_heater">🔥 Baseboard Heater</MenuItem>
                  <MenuItem value="jacuzzi">🛁 Jacuzzi/Hot Tub</MenuItem>
                  <MenuItem value="hvac_unit">💨 HVAC Unit</MenuItem>
                  <MenuItem value="ceiling_fan">🌪️ Ceiling Fan</MenuItem>
                  <MenuItem value="electric_water_heater">🚿 Water Heater</MenuItem>
                  <MenuItem value="electric_dryer">👕 Electric Dryer</MenuItem>
                  <MenuItem value="electric_range">🍳 Range/Oven</MenuItem>
                  <MenuItem value="dishwasher">🧽 Dishwasher</MenuItem>
                  <MenuItem value="garbage_disposal">🗑️ Garbage Disposal</MenuItem>
                  <MenuItem value="refrigerator">❄️ Refrigerator</MenuItem>
                  <MenuItem value="microwave">📻 Microwave</MenuItem>
                  <MenuItem value="air_conditioner">🌬️ Air Conditioner</MenuItem>
                  <MenuItem value="heat_pump">♨️ Heat Pump</MenuItem>
                  <MenuItem value="floor_heating">🔥 Floor Heating</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Electrical Specs in one row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Amperage - only for outlets */}
            {formData.type === 'outlet' && (
              <FormControl sx={{ flex: 1 }} size="small">
                <InputLabel>Outlet Rating</InputLabel>
                <Select
                  value={formData.amperage || 15}
                  onChange={(e) => handleChange('amperage', e.target.value)}
                  label="Outlet Rating"
                >
                  {getAmperageOptions().map(amp => (
                    <MenuItem key={amp} value={amp}>
                      {amp}A outlet
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* For appliances, show calculated minimum circuit requirement */}
            {formData.type === 'appliance' && (formData.wattage > 0 || calculateComponentLoad({ 
              type: formData.type, 
              properties: {
                appliance_type: formData.appliance_type,
                gfci: formData.gfci,
                dedicated: formData.dedicated,
                switched: formData.switched
              }
            }) > 0) && (
              <TextField
                label="Min. Circuit Required"
                sx={{ flex: 1 }}
                value={(() => {
                  const watts = formData.wattage || calculateComponentLoad({ 
                    type: formData.type, 
                    properties: {
                      appliance_type: formData.appliance_type,
                      gfci: formData.gfci,
                      dedicated: formData.dedicated,
                      switched: formData.switched
                    }
                  });
                  
                  // If circuit is selected, show requirement for that voltage
                  if (formData.circuit_id) {
                    const selectedCircuit = circuits.find(c => c.id === formData.circuit_id);
                    if (selectedCircuit) {
                      const voltage = selectedCircuit.breaker_type === 'double' ? 240 : 120;
                      const amps = Math.ceil((watts / voltage) / 0.8);
                      return `${amps}A @ ${voltage}V`;
                    }
                  }
                  
                  // Default: show 120V requirement
                  const amps120 = Math.ceil((watts / 120) / 0.8);
                  return `${amps120}A @ 120V`;
                })()}
                disabled
                size="small"
                helperText="125% NEC rule"
              />
            )}

            {/* Wattage */}
            <TextField
              label="Wattage (W)"
              type="number"
              sx={{ flex: 1 }}
              size="small"
              value={formData.wattage || (() => {
                // Show default wattage if no custom value is set
                const defaultWattage = calculateComponentLoad({ 
                  type: formData.type, 
                  properties: {
                    appliance_type: formData.appliance_type,
                    gfci: formData.gfci,
                    dedicated: formData.dedicated,
                    switched: formData.switched
                  }
                });
                return defaultWattage;
              })()}
              onChange={(e) => handleChange('wattage', parseInt(e.target.value) || 0)}
              helperText="Click to customize"
              InputProps={{
                inputProps: { min: 0, max: 50000 }
              }}
            />

            <TextField
              label="Room"
              sx={{ flex: 1 }}
              value={(() => {
                const room = rooms.find(r => r.id === formData.room_id);
                return room ? (room.label || room.name || `Room ${room.id}`) : 'None';
              })()}
              disabled
              size="small"
              helperText="Auto-detected"
            />
          </Box>

          {/* Circuit Assignment with Load Information */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel>Circuit Assignment</InputLabel>
              <Select
                value={formData.circuit_id}
                onChange={(e) => handleChange('circuit_id', e.target.value)}
                label="Circuit Assignment"
              >
                <MenuItem value="">
                  <em>⚠️ No Circuit Assigned</em>
                </MenuItem>
                {circuits.map(circuit => {
                  // Calculate circuit capacity with actual components (exclude current component to avoid double-counting)
                  const circuitVoltage = circuit.breaker_type === 'double' ? 240 : (circuit.voltage || 120);
                  const circuitComponents = components.filter(comp => 
                    comp.circuit_id === circuit.id && comp.id !== component?.id
                  );
                  const capacity = calculateCircuitCapacity({
                    amperage: circuit.amperage || 20,
                    voltage: circuitVoltage,
                    components: circuitComponents
                  });
                  
                  return (
                    <MenuItem key={circuit.id} value={circuit.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <span>🔌 Breaker {circuit.breaker_position} - {circuit.amperage}A @ {circuit.breaker_type === 'double' ? '240' : (circuit.voltage || 120)}V</span>
                        {circuit.label && <span>({circuit.label})</span>}
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="textSecondary">
                            {formatLoad(capacity.availableCapacity)} available
                          </Typography>
                          <Box
                            sx={{
                              width: 4,
                              height: 16,
                              bgcolor: getLoadColor(capacity.utilization),
                              borderRadius: 1
                            }}
                          />
                        </Box>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            
            {/* Circuit Load Indicator */}
            {formData.circuit_id && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                {(() => {
                  const selectedCircuit = circuits.find(c => c.id === formData.circuit_id);
                  if (!selectedCircuit) return null;
                  
                  const circuitVoltage = selectedCircuit.breaker_type === 'double' ? 240 : (selectedCircuit.voltage || 120);
                  const circuitComponents = components.filter(comp => 
                    comp.circuit_id === selectedCircuit.id && comp.id !== component?.id
                  );
                  const capacity = calculateCircuitCapacity({
                    amperage: selectedCircuit.amperage || 20,
                    voltage: circuitVoltage,
                    components: circuitComponents
                  });
                  
                  const componentLoad = calculateComponentLoad({ 
                    type: formData.type, 
                    wattage: formData.wattage,
                    properties: {
                      appliance_type: formData.appliance_type,
                      gfci: formData.gfci,
                      dedicated: formData.dedicated,
                      switched: formData.switched
                    }
                  });
                  
                  return (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Circuit Load: {formatLoad(capacity.currentLoad)} / {formatLoad(capacity.maxCapacity)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {capacity.utilization}%
                        </Typography>
                      </Box>
                      {/* Custom stacked progress bar showing existing vs new component load */}
                      <Box sx={{ position: 'relative', height: 6, borderRadius: 1, bgcolor: 'grey.200', overflow: 'hidden' }}>
                        {/* Existing components load (solid) */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${Math.min((capacity.currentLoad / capacity.maxCapacity) * 100, 100)}%`,
                            bgcolor: getLoadColor(capacity.utilization),
                            borderRadius: 1
                          }}
                        />
                        {/* Current component load (diagonal stripes) */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${Math.min((capacity.currentLoad / capacity.maxCapacity) * 100, 100)}%`,
                            top: 0,
                            height: '100%',
                            width: `${Math.min((componentLoad / capacity.maxCapacity) * 100, 100 - Math.min((capacity.currentLoad / capacity.maxCapacity) * 100, 100))}%`,
                            background: `repeating-linear-gradient(
                              45deg,
                              ${getLoadColor(Math.min(((capacity.currentLoad + componentLoad) / capacity.maxCapacity) * 100, 100))},
                              ${getLoadColor(Math.min(((capacity.currentLoad + componentLoad) / capacity.maxCapacity) * 100, 100))} 2px,
                              transparent 2px,
                              transparent 4px
                            )`,
                            borderRadius: 1
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                        Adding this {formData.type} will use {formatLoad(componentLoad)} 
                        ({(() => {
                          // Detect if this is a double pole breaker (240V)
                          const voltage = selectedCircuit.breaker_type === 'double' ? 240 : (selectedCircuit.voltage || 120);
                          const current = (componentLoad / voltage).toFixed(1);
                          return `${current}A at ${voltage}V`;
                        })()})
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>
            )}
          </Box>

          {/* Electrical Info */}
          {formData.wattage > 0 && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                <strong>Electrical Requirements:</strong>
              </Typography>
              <Typography variant="body2">
                {formData.wattage}W = {(formData.wattage / 120).toFixed(1)}A @ 120V or {(formData.wattage / 240).toFixed(1)}A @ 240V
              </Typography>
              {formData.type === 'outlet' && formData.amperage && (
                <Typography variant="caption" color={formData.wattage > (formData.amperage * 120 * 0.8) ? 'error' : 'textSecondary'}>
                  {formData.amperage}A outlet rating {formData.wattage > (formData.amperage * 120 * 0.8) 
                    ? '⚠️ May exceed 80% rule' 
                    : '✓ Within safe limits'}
                </Typography>
              )}
              {formData.type === 'appliance' && (
                <Typography variant="caption" color="textSecondary">
                  NEC requires {Math.ceil(((formData.wattage || calculateComponentLoad({ 
                    type: formData.type, 
                    properties: {
                      appliance_type: formData.appliance_type,
                      gfci: formData.gfci,
                      dedicated: formData.dedicated,
                      switched: formData.switched
                    }
                  })) / 120) / 0.8)}A minimum @ 120V or {Math.ceil(((formData.wattage || calculateComponentLoad({ 
                    type: formData.type, 
                    properties: {
                      appliance_type: formData.appliance_type,
                      gfci: formData.gfci,
                      dedicated: formData.dedicated,
                      switched: formData.switched
                    }
                  })) / 240) / 0.8)}A @ 240V (125% rule)
                </Typography>
              )}
            </Box>
          )}

          {/* Special Features - Compact */}
          {(formData.type === 'outlet' || formData.type === 'appliance') && (
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.gfci}
                    onChange={(e) => handleChange('gfci', e.target.checked)}
                    size="small"
                  />
                }
                label="GFCI"
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.dedicated}
                    onChange={(e) => handleChange('dedicated', e.target.checked)}
                    size="small"
                  />
                }
                label="Dedicated"
              />

              {formData.type === 'outlet' && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.switched}
                      onChange={(e) => handleChange('switched', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Switched"
                />
              )}
            </Box>
          )}

          {/* Notes - Compact */}
          <TextField
            label="Notes"
            fullWidth
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes..."
            size="small"
          />

          {/* Status - Compact */}
          {component && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Position: ({Math.round(component.x)}, {Math.round(component.y)})
              </Typography>
              {formData.circuit_id ? (
                <Chip label="Circuit OK" size="small" color="success" />
              ) : (
                <Chip label="No Circuit" size="small" color="warning" />
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ComponentPropertiesDialog; 