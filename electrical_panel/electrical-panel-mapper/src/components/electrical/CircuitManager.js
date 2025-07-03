import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Typography,
  Chip,
  Box,
  Autocomplete
} from '@mui/material';

/**
 * Circuit management dialog for creating and editing electrical circuits
 * Handles breaker assignment, component assignment, and circuit properties
 */
const CircuitManager = ({
  open,
  onClose,
  onSave,
  circuit = null,
  panels = [],
  components = [],
  existingCircuits = [],
  selectedComponent = null
}) => {
  const [formData, setFormData] = useState({
    panel_id: '',
    breaker_position: '',
    circuit_label: '',
    amperage: 20,
    wire_gauge: '12 AWG',
    breaker_type: 'single',
    color_code: '',
    components: []
  });

  const [availableBreakers, setAvailableBreakers] = useState([]);

  // Wire gauge options
  const wireGauges = ['14 AWG', '12 AWG', '10 AWG', '8 AWG', '6 AWG'];
  
  // Breaker type options  
  const breakerTypes = [
    { value: 'single', label: 'Single Pole' },
    { value: 'double', label: 'Double Pole' },
    { value: 'GFCI', label: 'GFCI' },
    { value: 'AFCI', label: 'AFCI' },
    { value: 'GFCI_AFCI', label: 'GFCI/AFCI' }
  ];

  // Standard circuit colors
  const circuitColors = [
    { value: '#FF5722', label: 'Red' },
    { value: '#2196F3', label: 'Blue' },
    { value: '#4CAF50', label: 'Green' },
    { value: '#FF9800', label: 'Orange' },
    { value: '#9C27B0', label: 'Purple' },
    { value: '#607D8B', label: 'Blue Grey' },
    { value: '#795548', label: 'Brown' },
    { value: '#3F51B5', label: 'Indigo' }
  ];

  // Initialize form data when dialog opens
  useEffect(() => {
    if (open) {
      if (circuit) {
        // Editing existing circuit
        setFormData({
          panel_id: circuit.panel_id || '',
          breaker_position: circuit.breaker_position || '',
          circuit_label: circuit.circuit_label || '',
          amperage: circuit.amperage || 20,
          wire_gauge: circuit.wire_gauge || '12 AWG',
          breaker_type: circuit.breaker_type || 'single',
          color_code: circuit.color_code || '',
          components: circuit.components || []
        });
      } else {
        // Creating new circuit
        const defaultPanel = panels[0];
        setFormData({
          panel_id: defaultPanel?.id || '',
          breaker_position: '',
          circuit_label: '',
          amperage: 20,
          wire_gauge: '12 AWG',
          breaker_type: 'single',
          color_code: '',
          components: selectedComponent ? [selectedComponent.id] : []
        });
      }
    }
  }, [open, circuit, panels, selectedComponent]);

  // Calculate available breaker positions when panel changes
  useEffect(() => {
    if (formData.panel_id) {
      const panel = panels.find(p => p.id === formData.panel_id);
      if (panel) {
        const totalPositions = panel.total_positions || 30;
        const usedPositions = existingCircuits
          .filter(c => c.panel_id === formData.panel_id && c.id !== circuit?.id)
          .map(c => c.breaker_position);
        
        const available = [];
        for (let i = 1; i <= totalPositions; i++) {
          if (!usedPositions.includes(i)) {
            available.push(i);
          }
        }
        setAvailableBreakers(available);
      }
    }
  }, [formData.panel_id, existingCircuits, circuit, panels]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleComponentsChange = (event, newComponents) => {
    const componentIds = newComponents.map(comp => 
      typeof comp === 'string' ? comp : comp.id
    );
    handleInputChange('components', componentIds);
  };

  const handleSave = () => {
    const circuitData = {
      ...formData,
      id: circuit?.id || null
    };
    onSave(circuitData);
    onClose();
  };

  const getComponentLabel = (componentId) => {
    const comp = components.find(c => c.id === componentId);
    return comp ? `${comp.type} (${comp.label || 'Unlabeled'})` : 'Unknown Component';
  };

  const selectedPanel = panels.find(p => p.id === formData.panel_id);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {circuit ? 'Edit Circuit' : 'Create New Circuit'}
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Panel Selection */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Panel</InputLabel>
              <Select
                value={formData.panel_id}
                onChange={(e) => handleInputChange('panel_id', e.target.value)}
                label="Panel"
              >
                {panels.map(panel => (
                  <MenuItem key={panel.id} value={panel.id}>
                    {panel.panel_name} ({panel.main_breaker_amps}A)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Breaker Position */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Breaker Position</InputLabel>
              <Select
                value={formData.breaker_position}
                onChange={(e) => handleInputChange('breaker_position', e.target.value)}
                label="Breaker Position"
                disabled={!formData.panel_id}
              >
                {availableBreakers.map(position => (
                  <MenuItem key={position} value={position}>
                    Position {position}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Circuit Label */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Circuit Label"
              value={formData.circuit_label}
              onChange={(e) => handleInputChange('circuit_label', e.target.value)}
              placeholder="e.g., Kitchen Outlets, Living Room Lights"
            />
          </Grid>

          {/* Amperage */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Amperage"
              type="number"
              value={formData.amperage}
              onChange={(e) => handleInputChange('amperage', parseInt(e.target.value))}
              inputProps={{ min: 15, max: 50, step: 5 }}
            />
          </Grid>

          {/* Wire Gauge */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Wire Gauge</InputLabel>
              <Select
                value={formData.wire_gauge}
                onChange={(e) => handleInputChange('wire_gauge', e.target.value)}
                label="Wire Gauge"
              >
                {wireGauges.map(gauge => (
                  <MenuItem key={gauge} value={gauge}>
                    {gauge}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Breaker Type */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Breaker Type</InputLabel>
              <Select
                value={formData.breaker_type}
                onChange={(e) => handleInputChange('breaker_type', e.target.value)}
                label="Breaker Type"
              >
                {breakerTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Circuit Color */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Circuit Color</InputLabel>
              <Select
                value={formData.color_code}
                onChange={(e) => handleInputChange('color_code', e.target.value)}
                label="Circuit Color"
              >
                {circuitColors.map(color => (
                  <MenuItem key={color.value} value={color.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: color.value,
                          borderRadius: 1,
                          border: '1px solid #ddd'
                        }}
                      />
                      {color.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Component Assignment */}
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={components}
              getOptionLabel={(option) => getComponentLabel(option.id || option)}
              value={components.filter(comp => formData.components.includes(comp.id))}
              onChange={handleComponentsChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign Components"
                  placeholder="Select components for this circuit"
                />
              )}
              renderTags={(tagValue, getTagProps) =>
                tagValue.map((option, index) => (
                  <Chip
                    label={getComponentLabel(option.id)}
                    {...getTagProps({ index })}
                    key={option.id}
                    size="small"
                  />
                ))
              }
            />
          </Grid>

          {/* Circuit Summary */}
          {selectedPanel && formData.breaker_position && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Circuit Summary
                </Typography>
                <Typography variant="body2">
                  <strong>Panel:</strong> {selectedPanel.panel_name} • 
                  <strong> Breaker:</strong> Position {formData.breaker_position} • 
                  <strong> Rating:</strong> {formData.amperage}A {formData.breaker_type}
                </Typography>
                <Typography variant="body2">
                  <strong>Wire:</strong> {formData.wire_gauge} • 
                  <strong> Components:</strong> {formData.components.length} assigned
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={!formData.panel_id || !formData.breaker_position}
        >
          {circuit ? 'Update Circuit' : 'Create Circuit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CircuitManager; 