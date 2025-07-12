import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Divider,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ElectricalServices as ElectricalIcon,
  CheckCircle as CheckIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import config from '../config';

const PanelConfiguration = ({
  project,
  onProceedToMapping,
  onBackToFloorPlan
}) => {
  const [panels, setPanels] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [showPanelDialog, setShowPanelDialog] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [showCircuitDialog, setShowCircuitDialog] = useState(false);
  const [editingCircuit, setEditingCircuit] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmCircuit, setDeleteConfirmCircuit] = useState(null);
  const [deleteConfirmPanel, setDeleteConfirmPanel] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [doublePolePositions, setDoublePolePositions] = useState({ first: '', second: '' });

  const [panelForm, setPanelForm] = useState({
    panel_name: '',
    main_breaker_amps: 200,
    total_positions: 30,
    x_position: 50,
    y_position: 50,
    panel_type: 'residential' // simplified
  });

  const [circuitForm, setCircuitForm] = useState({
    breaker_position: '',
    circuit_label: '',
    amperage: 20,
    breaker_type: 'single',
    wire_gauge: '12 AWG',
    color_code: '#4CAF50'
  });

  // Simplified panel configuration - user can customize everything
  const commonAmperages = [100, 125, 150, 200, 225, 300, 400];
  const commonPositions = [12, 16, 20, 24, 30, 40, 42];

  const breakerTypes = [
    { value: 'single', label: 'Single Pole (120V)', positions: 1 },
    { value: 'double', label: 'Double Pole (240V)', positions: 2 },
    { value: 'gfci', label: 'GFCI', positions: 1 },
    { value: 'afci', label: 'AFCI', positions: 1 },
    { value: 'gfci_double', label: 'GFCI Double Pole', positions: 2 }
  ];

  const wireGauges = [
    '14 AWG', '12 AWG', '10 AWG', '8 AWG', '6 AWG', '4 AWG', '2 AWG', '1 AWG', '1/0 AWG', '2/0 AWG'
  ];

  const circuitColors = [
    '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0',
    '#00BCD4', '#FFEB3B', '#795548', '#607D8B', '#E91E63',
    '#8BC34A', '#3F51B5', '#FF5722', '#009688', '#FFC107'
  ];

  useEffect(() => {
    loadPanelData();
  }, [project]);

  const loadPanelData = async () => {
    if (!project?.id) return;

    try {
      // Load panels for this floor plan
      const panelsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/panels?floor_plan_id=${project.id}`);
      if (panelsResponse.ok) {
        const panelsData = await panelsResponse.json();
        const panelsArray = Array.isArray(panelsData) ? panelsData : [];
        setPanels(panelsArray);

        // Load circuits for each panel
        const allCircuits = [];
        for (const panel of panelsArray) {
          const circuitsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/circuits?panel_id=${panel.id}`);
          if (circuitsResponse.ok) {
            const panelCircuits = await circuitsResponse.json();
            const circuitsArray = Array.isArray(panelCircuits) ? panelCircuits : [];
            allCircuits.push(...circuitsArray);
          }
        }
        setCircuits(allCircuits);

        if (panelsArray.length > 0 && !selectedPanel) {
          setSelectedPanel(panelsArray[0]);
        }
      } else {
        setPanels([]);
        setCircuits([]);
      }
    } catch (error) {
      console.error('Failed to load panel data:', error);
      setPanels([]);
      setCircuits([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePanel = async () => {
    // Validate panel form
    if (!panelForm.panel_name.trim()) {
      setValidationError('Panel name is required');
      return;
    }

    setValidationError('');

    const panelData = {
      ...panelForm,
      floor_plan_id: project.id,
      panel_type: `${panelForm.main_breaker_amps}A_${panelForm.total_positions}_position`
    };

    try {
      const url = editingPanel
        ? `${config.BACKEND_URL}/api/electrical/panels/${editingPanel.id}`
        : `${config.BACKEND_URL}/api/electrical/panels`;

      const method = editingPanel ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(panelData)
      });

      if (response.ok) {
        // If reducing panel size, warn about circuits that will be lost
        if (editingPanel && panelForm.total_positions < editingPanel.total_positions) {
          const affectedCircuits = getSelectedPanelCircuits().filter(
            c => c.breaker_position > panelForm.total_positions
          );

          if (affectedCircuits.length > 0) {
            // Show confirmation dialog instead of browser alert
            setValidationError(`Warning: Reducing panel size will remove ${affectedCircuits.length} circuits in positions ${affectedCircuits.map(c => c.breaker_position).join(', ')}.`);
            return;
          }
        }

        loadPanelData();
        setShowPanelDialog(false);
        setEditingPanel(null);
        resetPanelForm();
      }
    } catch (error) {
      console.error('Failed to save panel:', error);
      setValidationError('Failed to save panel. Please try again.');
    }
  };

  const handleSaveCircuit = async (saveAndAddNew = false) => {
    if (!selectedPanel) return;

    // For double-pole breakers, validate both positions
    if (circuitForm.breaker_type === 'double' || circuitForm.breaker_type === 'gfci_double') {
      if (!doublePolePositions.first || !doublePolePositions.second) {
        setValidationError('Double-pole breakers require two positions to be specified');
        return;
      }

      const pos1 = parseInt(doublePolePositions.first);
      const pos2 = parseInt(doublePolePositions.second);

      if (pos1 === pos2) {
        setValidationError('Double-pole breakers must use two different positions');
        return;
      }

      // Check both positions are available
      const conflictingCircuits = getSelectedPanelCircuits().filter(c => {
        if (editingCircuit && c.id === editingCircuit.id) return false;
        // Check if either position conflicts with existing circuit's primary or secondary position
        return c.breaker_position === pos1 || c.breaker_position === pos2 ||
               c.secondary_position === pos1 || c.secondary_position === pos2;
      });

      if (conflictingCircuits.length > 0) {
        setValidationError(`Position conflict with existing circuit: ${conflictingCircuits[0].circuit_label}`);
        return;
      }

      // Use the first position as the primary position for the circuit
      const position = pos1;
    } else {
      // Single-pole breaker validation
      const position = parseInt(circuitForm.breaker_position);
      if (!position || position < 1 || position > selectedPanel.total_positions) {
        setValidationError(`Breaker position must be between 1 and ${selectedPanel.total_positions}`);
        return;
      }

      // Check for position conflicts
      const conflictingCircuits = getSelectedPanelCircuits().filter(c => {
        if (editingCircuit && c.id === editingCircuit.id) return false;
        return c.breaker_position === position;
      });

      if (conflictingCircuits.length > 0) {
        setValidationError(`Position ${position} is already occupied by circuit: ${conflictingCircuits[0].circuit_label}`);
        return;
      }
    }

    // Circuit label is optional - no validation needed

    setValidationError('');

    // Determine the position to save
    const isDoublePole = circuitForm.breaker_type === 'double' || circuitForm.breaker_type === 'gfci_double';
    const primaryPosition = isDoublePole ? parseInt(doublePolePositions.first) : parseInt(circuitForm.breaker_position);

    const circuitData = {
      ...circuitForm,
      panel_id: selectedPanel.id,
      breaker_position: primaryPosition,
      // Store the second position for double-pole breakers in a JSON field or separate logic
      secondary_position: isDoublePole ? parseInt(doublePolePositions.second) : null
    };

    try {
      const url = editingCircuit
        ? `${config.BACKEND_URL}/api/electrical/circuits/${editingCircuit.id}`
        : `${config.BACKEND_URL}/api/electrical/circuits`;

      const method = editingCircuit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(circuitData)
      });

      if (response.ok) {
        await loadPanelData();

        if (saveAndAddNew && !editingCircuit) {
          // For Save & Add Another, we need to reset the form with the next available position
          // Calculate the next available position based on the circuit we just added
          const nextUsedPositions = new Set(getUsedBreakerPositions());
          nextUsedPositions.add(primaryPosition); // Add the position we just used
          if (isDoublePole && parseInt(doublePolePositions.second)) {
            nextUsedPositions.add(parseInt(doublePolePositions.second));
          }

          // Find next available position
          let nextAvailable = null;
          for (let i = 1; i <= selectedPanel.total_positions; i++) {
            if (!nextUsedPositions.has(i)) {
              nextAvailable = i;
              break;
            }
          }

          // Reset form with next available position
          setCircuitForm({
            breaker_position: nextAvailable ? nextAvailable.toString() : '',
            circuit_label: '',
            amperage: 20,
            breaker_type: 'single',
            wire_gauge: '12 AWG',
            color_code: circuitColors[Math.floor(Math.random() * circuitColors.length)]
          });

          // Reset double-pole positions
          let nextAvailable2 = null;
          for (let i = nextAvailable + 1; i <= selectedPanel.total_positions; i++) {
            if (!nextUsedPositions.has(i)) {
              nextAvailable2 = i;
              break;
            }
          }

          setDoublePolePositions({
            first: nextAvailable ? nextAvailable.toString() : '',
            second: nextAvailable2 ? nextAvailable2.toString() : ''
          });
          setValidationError('');
        } else {
          // Close dialog
          setShowCircuitDialog(false);
          setEditingCircuit(null);
          resetCircuitForm();
        }
      } else {
        setValidationError('Failed to save circuit. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save circuit:', error);
      setValidationError('Failed to save circuit. Please try again.');
    }
  };

  const handleDeleteCircuit = (circuit) => {
    setDeleteConfirmCircuit(circuit);
  };

  const confirmDeleteCircuit = async () => {
    if (!deleteConfirmCircuit) return;

    try {
      const response = await fetch(`${config.BACKEND_URL}/api/electrical/circuits/${deleteConfirmCircuit.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadPanelData();
        setDeleteConfirmCircuit(null);
      } else {
        setValidationError('Failed to delete circuit. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete circuit:', error);
      setValidationError('Failed to delete circuit. Please try again.');
    }
  };

  const handleDeletePanel = (panel) => {
    setDeleteConfirmPanel(panel);
  };

  const confirmDeletePanel = async () => {
    if (!deleteConfirmPanel) return;

    const panelCircuits = circuits.filter(c => c.panel_id === deleteConfirmPanel.id);

    try {
      // First delete all circuits in this panel
      for (const circuit of panelCircuits) {
        await fetch(`${config.BACKEND_URL}/api/electrical/circuits/${circuit.id}`, {
          method: 'DELETE'
        });
      }

      // Then delete the panel
      const response = await fetch(`${config.BACKEND_URL}/api/electrical/panels/${deleteConfirmPanel.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // If we deleted the selected panel, clear selection
        if (selectedPanel?.id === deleteConfirmPanel.id) {
          setSelectedPanel(null);
        }
        loadPanelData();
        setDeleteConfirmPanel(null);
      } else {
        setValidationError('Failed to delete panel. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete panel:', error);
      setValidationError('Failed to delete panel. Please try again.');
    }
  };

  const resetPanelForm = () => {
    setPanelForm({
      panel_name: '',
      main_breaker_amps: 200,
      total_positions: 30,
      x_position: 50,
      y_position: 50,
      panel_type: 'residential'
    });
  };

  const resetCircuitForm = () => {
    // Get fresh available positions (important for "Save & Add New")
    const availablePositions = getAvailablePositions();
    const firstAvailable = availablePositions[0];

    setCircuitForm({
      breaker_position: firstAvailable ? firstAvailable.toString() : '',
      circuit_label: '',
      amperage: 20,
      breaker_type: 'single',
      wire_gauge: '12 AWG',
      color_code: circuitColors[Math.floor(Math.random() * circuitColors.length)]
    });

    // Reset double-pole positions with first two available positions
    const firstDoublePole = availablePositions[0];
    const secondDoublePole = availablePositions[1];
    setDoublePolePositions({
      first: firstDoublePole ? firstDoublePole.toString() : '',
      second: secondDoublePole ? secondDoublePole.toString() : ''
    });
    setValidationError('');
  };

  const editPanel = (panel) => {
    setEditingPanel(panel);
    setPanelForm({
      panel_name: panel.panel_name,
      main_breaker_amps: panel.main_breaker_amps,
      total_positions: panel.total_positions,
      x_position: panel.x_position,
      y_position: panel.y_position,
      panel_type: 'residential'
    });
    setShowPanelDialog(true);
  };

  const editCircuit = (circuit) => {
    setEditingCircuit(circuit);
    setCircuitForm({
      breaker_position: circuit.breaker_position.toString(),
      circuit_label: circuit.circuit_label,
      amperage: circuit.amperage,
      breaker_type: circuit.breaker_type,
      wire_gauge: circuit.wire_gauge,
      color_code: circuit.color_code
    });

    // Set double-pole positions if applicable
    if (circuit.breaker_type === 'double' || circuit.breaker_type === 'gfci_double') {
      setDoublePolePositions({
        first: circuit.breaker_position.toString(),
        second: circuit.secondary_position ? circuit.secondary_position.toString() : ''
      });
    } else {
      setDoublePolePositions({ first: '', second: '' });
    }

    setShowCircuitDialog(true);
  };

  const getSelectedPanelCircuits = () => {
    return selectedPanel ? circuits.filter(c => c.panel_id === selectedPanel.id) : [];
  };

  const getUsedBreakerPositions = () => {
    const usedPositions = new Set();
    getSelectedPanelCircuits().forEach(circuit => {
      // Add the primary position
      usedPositions.add(circuit.breaker_position);

      // Add the secondary position for double-pole breakers
      if (circuit.secondary_position) {
        usedPositions.add(circuit.secondary_position);
      }
    });
    return Array.from(usedPositions);
  };

  const getAvailablePositions = () => {
    if (!selectedPanel) return [];

    const used = getUsedBreakerPositions();
    const available = [];

    for (let i = 1; i <= selectedPanel.total_positions; i++) {
      if (!used.includes(i)) {
        available.push(i);
      }
    }

    return available;
  };

  const isReadyToProceed = () => {
    return Array.isArray(panels) && panels.length > 0;
  };

  const getPanelUtilization = (panel) => {
    const panelCircuits = circuits.filter(c => c.panel_id === panel.id);
    // Each circuit uses one position slot, regardless of breaker type
    const usedPositions = panelCircuits.length;

    return {
      used: usedPositions,
      total: panel.total_positions,
      percentage: Math.round((usedPositions / panel.total_positions) * 100)
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>Loading panel configuration...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={1} alternativeLabel sx={{ mb: 3 }}>
          <Step completed>
            <StepLabel>Floor Plan</StepLabel>
          </Step>
          <Step active>
            <StepLabel>Panel Setup</StepLabel>
          </Step>
          <Step>
            <StepLabel>Component Mapping</StepLabel>
          </Step>
        </Stepper>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Electrical Panel Configuration
        </Typography>
        <Typography variant="h6" color="textSecondary" align="center" sx={{ mb: 3 }}>
          {project.name} - Configure panels and circuit breakers
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Panels List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Electrical Panels</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setShowPanelDialog(true)}
                  variant="contained"
                  size="small"
                >
                  Add Panel
                </Button>
              </Box>

              {!Array.isArray(panels) || panels.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No panels configured yet. Add your first electrical panel to get started.
                </Alert>
              ) : (
                <List>
                  {Array.isArray(panels) && panels.map((panel) => {
                    const util = getPanelUtilization(panel);
                    return (
                      <ListItem
                        key={panel.id}
                        selected={selectedPanel?.id === panel.id}
                        onClick={() => setSelectedPanel(panel)}
                        sx={{
                          cursor: 'pointer',
                          border: selectedPanel?.id === panel.id ? '2px solid' : '1px solid',
                          borderColor: selectedPanel?.id === panel.id ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          mb: 1
                        }}
                      >
                        <ListItemText
                          primary={panel.panel_name}
                          secondary={
                            <React.Fragment>
                              <Typography variant="body2" component="span">
                                {panel.main_breaker_amps}A Main • {panel.total_positions} Positions
                              </Typography>
                              <br />
                              <Typography variant="body2" color="textSecondary" component="span">
                                {util.used}/{util.total} positions used ({util.percentage}%)
                              </Typography>
                            </React.Fragment>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            editPanel(panel);
                          }}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePanel(panel);
                          }} color="error">
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Panel Details & Circuits */}
        <Grid item xs={12} md={8}>
          {selectedPanel ? (
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    {selectedPanel.panel_name} - Circuit Schedule
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetCircuitForm();
                      setShowCircuitDialog(true);
                    }}
                    variant="contained"
                    size="small"
                    disabled={getAvailablePositions().length === 0}
                  >
                    Add Circuit
                  </Button>
                </Box>

                {getAvailablePositions().length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Panel is full. Increase panel size or remove circuits to add more.
                  </Alert>
                )}

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Position</TableCell>
                        <TableCell>Amperage</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Circuit Label</TableCell>
                        <TableCell>Wire Gauge</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from({ length: selectedPanel.total_positions }, (_, i) => {
                        const position = i + 1;
                        const circuit = getSelectedPanelCircuits().find(c => c.breaker_position === position);
                        const secondaryCircuit = getSelectedPanelCircuits().find(c => c.secondary_position === position);
                        const displayCircuit = circuit || secondaryCircuit;
                        const isSecondaryPosition = !circuit && secondaryCircuit;

                        return (
                          <TableRow key={position} sx={{
                            backgroundColor: displayCircuit ? 'action.selected' : 'inherit'
                          }}>
                            <TableCell>
                              <Chip
                                label={isSecondaryPosition ? `${position}*` : position}
                                size="small"
                                color={displayCircuit ? "primary" : "default"}
                                style={{
                                  backgroundColor: displayCircuit?.color_code,
                                  color: displayCircuit ? 'white' : undefined
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {displayCircuit ? `${displayCircuit.amperage}A` : 'Spare'}
                            </TableCell>
                            <TableCell>
                              {displayCircuit ? breakerTypes.find(t => t.value === displayCircuit.breaker_type)?.label : '-'}
                            </TableCell>
                            <TableCell>
                              {displayCircuit?.circuit_label || 'Spare'}
                              {isSecondaryPosition && ' (2nd pole)'}
                            </TableCell>
                            <TableCell>{displayCircuit?.wire_gauge || '-'}</TableCell>
                            <TableCell>
                              {circuit && (
                                <Box>
                                  <IconButton size="small" onClick={() => editCircuit(circuit)}>
                                    <EditIcon />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDeleteCircuit(circuit)} color="error">
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <ElectricalIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="textSecondary">
                    Select a panel to view and manage circuits
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Add a panel first to get started with circuit configuration
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, mb: 2 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={onBackToFloorPlan}
          variant="outlined"
        >
          Back to Floor Plan
        </Button>

        <Button
          endIcon={<NextIcon />}
          onClick={onProceedToMapping}
          variant="contained"
          disabled={!isReadyToProceed()}
        >
          Proceed to Component Mapping
          {!isReadyToProceed() && (
            <Typography variant="caption" sx={{ ml: 1 }}>
              (Add at least one panel)
            </Typography>
          )}
        </Button>
      </Box>

      {/* Panel Configuration Dialog */}
      <Dialog
        open={showPanelDialog}
        onClose={() => setShowPanelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingPanel ? 'Edit Panel' : 'Add New Panel'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Panel Name"
              value={panelForm.panel_name}
              onChange={(e) => setPanelForm({...panelForm, panel_name: e.target.value})}
              sx={{ mb: 3 }}
              placeholder="e.g., Main Panel, Sub Panel 1, Garage Panel"
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="main-breaker-label">Main Breaker (Amps)</InputLabel>
                  <Select
                    labelId="main-breaker-label"
                    label="Main Breaker (Amps)"
                    value={panelForm.main_breaker_amps}
                    onChange={(e) => setPanelForm({...panelForm, main_breaker_amps: e.target.value})}
                  >
                    {commonAmperages.map(amp => (
                      <MenuItem key={amp} value={amp}>{amp}A</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel id="total-positions-label">Total Positions</InputLabel>
                  <Select
                    labelId="total-positions-label"
                    label="Total Positions"
                    value={panelForm.total_positions}
                    onChange={(e) => setPanelForm({...panelForm, total_positions: e.target.value})}
                  >
                    {commonPositions.map(pos => (
                      <MenuItem key={pos} value={pos}>{pos} positions</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {editingPanel && panelForm.total_positions < editingPanel.total_positions && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Warning:</strong> Reducing panel size may remove circuits in positions {editingPanel.total_positions + 1} and above.
                </Typography>
              </Alert>
            )}

            {validationError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {validationError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowPanelDialog(false);
            setValidationError('');
          }}>Cancel</Button>
          <Button onClick={handleSavePanel} variant="contained">
            {editingPanel ? 'Update Panel' : 'Add Panel'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Circuit Configuration Dialog */}
      <Dialog
        open={showCircuitDialog}
        onClose={() => setShowCircuitDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCircuit ? 'Edit Circuit' : 'Add New Circuit'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Breaker Type Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="breaker-type-label">Breaker Type</InputLabel>
              <Select
                labelId="breaker-type-label"
                label="Breaker Type"
                value={circuitForm.breaker_type}
                onChange={(e) => {
                  const newBreakerType = e.target.value;
                  const availablePositions = getAvailablePositions();

                  // Update breaker type
                  setCircuitForm({
                    ...circuitForm,
                    breaker_type: newBreakerType,
                    // Reset breaker position when changing types
                    breaker_position: availablePositions[0] ? availablePositions[0].toString() : ''
                  });

                  // Set appropriate positions for double-pole breakers
                  if (newBreakerType === 'double' || newBreakerType === 'gfci_double') {
                    setDoublePolePositions({
                      first: availablePositions[0] ? availablePositions[0].toString() : '',
                      second: availablePositions[1] ? availablePositions[1].toString() : ''
                    });
                  } else {
                    setDoublePolePositions({ first: '', second: '' });
                  }
                }}
              >
                {breakerTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Position Selection */}
            {circuitForm.breaker_type !== 'double' && circuitForm.breaker_type !== 'gfci_double' ? (
              /* Single-pole position selection */
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="breaker-position-label">Breaker Position</InputLabel>
                <Select
                  labelId="breaker-position-label"
                  label="Breaker Position"
                  value={circuitForm.breaker_position}
                  onChange={(e) => setCircuitForm({...circuitForm, breaker_position: e.target.value})}
                  displayEmpty
                >
                  <MenuItem value="">Select position</MenuItem>
                  {getAvailablePositions().map(pos => (
                    <MenuItem key={pos} value={pos.toString()}>Position {pos}</MenuItem>
                  ))}
                  {editingCircuit && (
                    <MenuItem value={editingCircuit.breaker_position.toString()}>
                      Position {editingCircuit.breaker_position} (current)
                    </MenuItem>
                  )}
                </Select>
                <FormHelperText>
                  {getAvailablePositions().length} positions available
                </FormHelperText>
              </FormControl>
            ) : (
              /* Double-pole position selection */
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel id="first-position-label">First Position</InputLabel>
                    <Select
                      labelId="first-position-label"
                      label="First Position"
                      value={doublePolePositions.first}
                      onChange={(e) => setDoublePolePositions({...doublePolePositions, first: e.target.value})}
                      displayEmpty
                    >
                      <MenuItem value="">Select position</MenuItem>
                      {getAvailablePositions().map(pos => (
                        <MenuItem key={pos} value={pos.toString()}>Position {pos}</MenuItem>
                      ))}
                      {editingCircuit && editingCircuit.breaker_position && (
                        <MenuItem value={editingCircuit.breaker_position.toString()}>
                          Position {editingCircuit.breaker_position} (current)
                        </MenuItem>
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel id="second-position-label">Second Position</InputLabel>
                    <Select
                      labelId="second-position-label"
                      label="Second Position"
                      value={doublePolePositions.second}
                      onChange={(e) => setDoublePolePositions({...doublePolePositions, second: e.target.value})}
                      displayEmpty
                    >
                      <MenuItem value="">Select position</MenuItem>
                      {getAvailablePositions().filter(pos => pos.toString() !== doublePolePositions.first).map(pos => (
                        <MenuItem key={pos} value={pos.toString()}>Position {pos}</MenuItem>
                      ))}
                      {editingCircuit && editingCircuit.secondary_position && (
                        <MenuItem value={editingCircuit.secondary_position.toString()}>
                          Position {editingCircuit.secondary_position} (current)
                        </MenuItem>
                      )}
                    </Select>
                    <FormHelperText>
                      Double-pole breakers require two separate positions
                    </FormHelperText>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {/* Circuit Label */}
            <TextField
              fullWidth
              label="Circuit Label (Optional)"
              value={circuitForm.circuit_label}
              onChange={(e) => setCircuitForm({...circuitForm, circuit_label: e.target.value})}
              sx={{ mb: 3 }}
              placeholder="e.g., Kitchen Outlets, Living Room Lights (optional)"
            />

            {/* Circuit Properties */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Amperage"
                  type="number"
                  value={circuitForm.amperage}
                  onChange={(e) => setCircuitForm({...circuitForm, amperage: parseInt(e.target.value)})}
                  inputProps={{ min: 15, max: 50 }}
                />
              </Grid>

              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel id="wire-gauge-label">Wire Gauge</InputLabel>
                  <Select
                    labelId="wire-gauge-label"
                    label="Wire Gauge"
                    value={circuitForm.wire_gauge}
                    onChange={(e) => setCircuitForm({...circuitForm, wire_gauge: e.target.value})}
                  >
                    {wireGauges.map(gauge => (
                      <MenuItem key={gauge} value={gauge}>{gauge}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={4}>
                <FormControl fullWidth>
                  <InputLabel id="color-label">Color</InputLabel>
                  <Select
                    labelId="color-label"
                    label="Color"
                    value={circuitForm.color_code}
                    onChange={(e) => setCircuitForm({...circuitForm, color_code: e.target.value})}
                  >
                    {circuitColors.map(color => (
                      <MenuItem key={color} value={color}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{
                            width: 20,
                            height: 20,
                            backgroundColor: color,
                            border: '1px solid #ccc',
                            borderRadius: '50%',
                            mr: 1
                          }} />
                          {color}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {validationError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {validationError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCircuitDialog(false);
            setValidationError('');
          }}>Cancel</Button>

          {!editingCircuit && (
            <Button
              onClick={() => handleSaveCircuit(true)}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Save & Add Another
            </Button>
          )}

          <Button onClick={() => handleSaveCircuit(false)} variant="contained">
            {editingCircuit ? 'Update Circuit' : 'Save Circuit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Panel Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmPanel}
        onClose={() => setDeleteConfirmPanel(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Panel</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete panel "{deleteConfirmPanel?.panel_name}"?
          </Typography>
          {deleteConfirmPanel && circuits.filter(c => c.panel_id === deleteConfirmPanel.id).length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                This will also delete {circuits.filter(c => c.panel_id === deleteConfirmPanel.id).length} circuit(s):
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                {circuits.filter(c => c.panel_id === deleteConfirmPanel.id).map(c => c.circuit_label).join(', ')}
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmPanel(null)}>Cancel</Button>
          <Button onClick={confirmDeletePanel} variant="contained" color="error">
            Delete Panel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Circuit Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmCircuit}
        onClose={() => setDeleteConfirmCircuit(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Circuit</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete circuit "{deleteConfirmCircuit?.circuit_label}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Position {deleteConfirmCircuit?.breaker_position} • {deleteConfirmCircuit?.amperage}A • {deleteConfirmCircuit?.breaker_type}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmCircuit(null)}>Cancel</Button>
          <Button onClick={confirmDeleteCircuit} variant="contained" color="error">
            Delete Circuit
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PanelConfiguration;