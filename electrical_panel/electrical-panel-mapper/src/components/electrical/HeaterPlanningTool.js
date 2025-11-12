import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { analyzeRoomHeatingCapacity, checkPanelHealth } from '../../utils/circuitCapacityChecker';
import { formatLoad } from '../../utils/loadCalculations';
import deviceTypesService from '../../services/deviceTypesService';

/**
 * HeaterPlanningTool Component
 * 
 * Helps users plan addition of heaters (especially IR heaters) to rooms
 * by analyzing circuit capacity and providing recommendations.
 */
const HeaterPlanningTool = ({ 
  open, 
  onClose, 
  rooms = [], 
  circuits = [], 
  components = []
}) => {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedHeater, setSelectedHeater] = useState('600-120'); // Default to HC-600 120V
  const [heaterCount, setHeaterCount] = useState(1);
  const [showPanelHealth, setShowPanelHealth] = useState(false);

  // Standard heater wattage options (based on specific models being considered)
  // Use unique key combining wattage-voltage to avoid selection issues
  const heaterOptions = [
    { id: '420-120', label: 'HC-420 (420W @ 120V, 24×24in) - 54-86 ft²', wattage: 420, voltage: 120, amperage: 3.5, price: 489 },
    { id: '420-240', label: 'HC-420 (420W @ 240V, 24×24in) - 54-86 ft²', wattage: 420, voltage: 240, amperage: 1.75, price: 489 },
    { id: '600-120', label: 'HC-600 (600W @ 120V, 31.5×24in) - 118-140 ft²', wattage: 600, voltage: 120, amperage: 5, price: 609 },
    { id: '600-240', label: 'HC-600 (600W @ 240V, 31.5×24in) - 118-140 ft²', wattage: 600, voltage: 240, amperage: 2.5, price: 609 },
    { id: '850-120', label: 'HC-850 (850W @ 120V, 47×24in) - 129-215 ft²', wattage: 850, voltage: 120, amperage: 7, price: 679 },
    { id: '850-240', label: 'HC-850 (850W @ 240V, 47×24in) - 129-215 ft²', wattage: 850, voltage: 240, amperage: 3.5, price: 679 },
    { id: '850L-120', label: 'HC-850L (850W @ 120V Long, 63×18in) - 129-215 ft²', wattage: 850, voltage: 120, amperage: 7, price: 799 },
    { id: '850L-240', label: 'HC-850L (850W @ 240V Long, 63×18in) - 129-215 ft²', wattage: 850, voltage: 240, amperage: 3.5, price: 799 },
    { id: '1050-120', label: 'HC-1050 (1050W @ 120V, 59×24in) - 151-258 ft²', wattage: 1050, voltage: 120, amperage: 8.75, price: 839 },
    { id: '1050-240', label: 'HC-1050 (1050W @ 240V, 59×24in) - 151-258 ft²', wattage: 1050, voltage: 240, amperage: 4.4, price: 839 },
    { id: '1200-240', label: 'HC-1200 (1200W @ 240V, 47×31.5in) - 183-312 ft²', wattage: 1200, voltage: 240, amperage: 5, price: 995 },
    { id: '1250L-240', label: 'HC-1250L (1250W @ 240V Long, 63×24in) - 183-312 ft²', wattage: 1250, voltage: 240, amperage: 5.2, price: 1099 }
  ];

  // Get current heater specs
  const currentHeater = heaterOptions.find(h => h.id === selectedHeater) || heaterOptions[2]; // Default to HC-600 120V

  // Calculate room analysis
  const roomAnalysis = useMemo(() => {
    if (!selectedRoom) return null;
    
    const room = rooms.find(r => r.id === selectedRoom);
    if (!room) return null;
    
    return analyzeRoomHeatingCapacity(
      room,
      circuits,
      components,
      { wattage: currentHeater.wattage, voltage: currentHeater.voltage, count: heaterCount },
      deviceTypesService
    );
  }, [selectedRoom, circuits, components, currentHeater, heaterCount, rooms]);

  // Calculate panel health
  const panelHealth = useMemo(() => {
    return checkPanelHealth(circuits, components, deviceTypesService);
  }, [circuits, components]);

  const handleReset = () => {
    setSelectedRoom('');
    setSelectedHeater('600-120');
    setHeaterCount(1);
    setShowPanelHealth(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalFireDepartmentIcon color="primary" />
          <Typography variant="h6">Heater Addition Planning Tool</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Panel Health Summary */}
          <Alert 
            severity={
              panelHealth.overallHealth === 'critical' ? 'error' :
              panelHealth.overallHealth === 'warning' ? 'warning' :
              panelHealth.overallHealth === 'caution' ? 'info' : 'success'
            }
            action={
              <Button 
                size="small" 
                onClick={() => setShowPanelHealth(!showPanelHealth)}
              >
                {showPanelHealth ? 'Hide' : 'Details'}
              </Button>
            }
          >
            <AlertTitle>Panel Status: {panelHealth.overallHealth.toUpperCase()}</AlertTitle>
            {panelHealth.summary.overloaded > 0 && (
              <Typography variant="body2">
                ⚠️ {panelHealth.summary.overloaded} circuit(s) overloaded
              </Typography>
            )}
            {panelHealth.summary.nearCapacity > 0 && (
              <Typography variant="body2">
                ⚠️ {panelHealth.summary.nearCapacity} circuit(s) near capacity
              </Typography>
            )}
            <Typography variant="body2">
              ✓ {panelHealth.summary.good} circuit(s) with good capacity
            </Typography>
          </Alert>

          {/* Panel Health Details */}
          {showPanelHealth && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Critical Issues:</Typography>
              {panelHealth.recommendations.map((rec, idx) => (
                <Alert key={idx} severity={rec.priority === 'high' ? 'error' : 'warning'} sx={{ mb: 1 }}>
                  <AlertTitle>{rec.message}</AlertTitle>
                  <Typography variant="body2">{rec.action}</Typography>
                  {rec.circuits && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                      Affected: {rec.circuits.join(', ')}
                    </Typography>
                  )}
                </Alert>
              ))}
            </Box>
          )}

          {/* Room Selection */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Room</InputLabel>
              <Select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                label="Select Room"
              >
                <MenuItem value="">
                  <em>Choose a room...</em>
                </MenuItem>
                {rooms.map(room => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.label || room.name || `Room ${room.id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Heater Specifications */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ flex: 2 }}>
              <InputLabel>Heater Model</InputLabel>
              <Select
                value={selectedHeater}
                onChange={(e) => setSelectedHeater(e.target.value)}
                label="Heater Model"
              >
                {heaterOptions.map(option => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={heaterCount}
              onChange={(e) => setHeaterCount(Math.max(1, parseInt(e.target.value) || 1))}
              InputProps={{ inputProps: { min: 1, max: 10 } }}
              sx={{ flex: 1 }}
            />
          </Box>

          {/* Room Analysis Results */}
          {roomAnalysis && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Analysis for "{roomAnalysis.room.label || roomAnalysis.room.name}"
              </Typography>

              {/* Summary Card */}
              <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {roomAnalysis.canAddAllHeaters ? (
                    <CheckCircleIcon color="success" fontSize="large" />
                  ) : (
                    <WarningIcon color="error" fontSize="large" />
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {roomAnalysis.canAddAllHeaters ? 
                        `✓ Can add ${heaterCount} × ${currentHeater.wattage}W heater${heaterCount > 1 ? 's' : ''}` : 
                        `⚠ Insufficient capacity for ${heaterCount} heater${heaterCount > 1 ? 's' : ''}`
                      }
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Total Load Needed
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatLoad(roomAnalysis.totalHeaterLoad)} ({(roomAnalysis.totalHeaterLoad / currentHeater.voltage).toFixed(1)}A @ {currentHeater.voltage}V)
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Available Capacity
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatLoad(roomAnalysis.totalAvailableCapacity)}
                        </Typography>
                      </Box>
                      {!roomAnalysis.canAddAllHeaters && (
                        <Box>
                          <Typography variant="caption" color="textSecondary" display="block">
                            Max Can Add
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="error">
                            {roomAnalysis.maxTotalHeaters} heater{roomAnalysis.maxTotalHeaters !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Recommendation */}
                {!roomAnalysis.canAddAllHeaters && (
                  <Alert 
                    severity={roomAnalysis.recommendation.type}
                    sx={{ mt: 2 }}
                  >
                    <AlertTitle>{roomAnalysis.recommendation.message}</AlertTitle>
                    {roomAnalysis.recommendation.actions.map((action, idx) => (
                      <Typography key={idx} variant="body2">• {action}</Typography>
                    ))}
                  </Alert>
                )}

                {/* Distribution Plan - only show if there IS a valid distribution */}
                {roomAnalysis.canAddAllHeaters && 
                 roomAnalysis.recommendation.distribution && 
                 roomAnalysis.recommendation.distribution.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom color="success.dark">
                      ✓ Installation Plan:
                    </Typography>
                    {roomAnalysis.recommendation.distribution.map((dist, idx) => (
                      <Box key={idx} sx={{ 
                        p: 1.5, 
                        bgcolor: 'background.paper', 
                        borderRadius: 1, 
                        mb: 1,
                        borderLeft: '3px solid',
                        borderColor: 'success.main'
                      }}>
                        <Typography variant="body2" fontWeight="bold">
                          Breaker {dist.circuit.breaker_position}
                          {dist.circuit.circuit_label && ` (${dist.circuit.circuit_label})`}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Add {dist.heatersToAdd} × {currentHeater.wattage}W heater{dist.heatersToAdd > 1 ? 's' : ''}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Remaining: {formatLoad(dist.remainingCapacity)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>

              {/* Detailed Circuit Analysis */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    Circuit Details ({roomAnalysis.circuitAnalysis.length} circuit(s) serving this room)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Circuit</TableCell>
                          <TableCell align="right">Current Load</TableCell>
                          <TableCell align="right">Available</TableCell>
                          <TableCell align="center">Can Add ({currentHeater.wattage}W)</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {roomAnalysis.circuitAnalysis.map((analysis, idx) => (
                          <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                Breaker {analysis.circuit.breaker_position}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {analysis.circuit.amperage}A @ {analysis.circuit.breaker_type === 'double' ? '240' : '120'}V
                                {analysis.circuit.circuit_label && ` • ${analysis.circuit.circuit_label}`}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatLoad(analysis.currentLoad)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color={analysis.availableCapacity > currentHeater.wattage ? 'success.main' : 'error.main'}>
                                {formatLoad(analysis.availableCapacity)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={`${analysis.maxHeatersCanAdd} heater${analysis.maxHeatersCanAdd !== 1 ? 's' : ''}`}
                                size="small"
                                color={analysis.maxHeatersCanAdd > 0 ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={analysis.canAddHeater ? '✓ OK' : 'Full'}
                                size="small"
                                color={analysis.canAddHeater ? 'success' : 'default'}
                                variant={analysis.canAddHeater ? 'filled' : 'outlined'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}

          {/* No Room Selected Message */}
          {!selectedRoom && (
            <Box sx={{ 
              p: 4, 
              textAlign: 'center', 
              bgcolor: 'grey.50', 
              borderRadius: 1 
            }}>
              <LocalFireDepartmentIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Select a room to analyze heating capacity
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This tool will help you determine if your existing circuits can handle additional heaters
              </Typography>
            </Box>
          )}

          {/* NEC Reference */}
          <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1, borderLeft: '3px solid #2196f3' }}>
            <Typography variant="subtitle2" gutterBottom>
              📘 NEC Guidelines for Electric Heating:
            </Typography>
            <Typography variant="body2" component="div">
              • Fixed electric space heating must be calculated at 100% of nameplate rating (NEC 220.51)
              <br />
              • Circuits must not exceed 80% continuous load capacity (NEC 210.19)
              <br />
              • 240V heaters use half the amperage for the same wattage (more efficient)
              <br />
              • Typical room sizing: 420W for 54-86 ft², 600W for 118-140 ft², 850W for 129-215 ft²
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HeaterPlanningTool;

