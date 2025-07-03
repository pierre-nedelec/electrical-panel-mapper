import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Lightbulb as LightIcon,
  Outlet as OutletIcon,
  Kitchen as ApplianceIcon,
  Home as HouseIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import {
  calculateWholeHouseLoad,
  calculateRoomLoads,
  formatLoad,
  getLoadColor,
  calculateCircuitCapacity
} from '../../utils/loadCalculations';

const LoadAnalysisPanel = ({ 
  rooms = [], 
  components = [], 
  circuits = [],
  panels = [],
  open = true,
  embedded = false 
}) => {
  const [expandedSection, setExpandedSection] = useState('overview');
  
  // Calculate comprehensive load analysis
  const loadAnalysis = useMemo(() => {
    return calculateWholeHouseLoad(components, rooms);
  }, [components, rooms]);
  
  const roomAnalysis = useMemo(() => {
    return calculateRoomLoads(rooms, components);
  }, [rooms, components]);

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  const getComplianceIcon = (score) => {
    if (score >= 100) return <CheckIcon color="success" />;
    if (score >= 85) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const getLoadUtilizationColor = (utilization) => {
    if (utilization < 60) return 'success';
    if (utilization < 80) return 'warning';
    return 'error';
  };

  if (!open) return null;

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {!embedded && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalculateIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Load Analysis</Typography>
        </Box>
      )}

      {/* Overview Section */}
      <Accordion 
        expanded={expandedSection === 'overview'} 
        onChange={handleAccordionChange('overview')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">📊 System Overview</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Connected Load
                  </Typography>
                  <Typography variant="h6">
                    {formatLoad(loadAnalysis.connectedLoad.total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Demand Load
                  </Typography>
                  <Typography variant="h6">
                    {formatLoad(loadAnalysis.demandLoad.total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Recommended Service: {loadAnalysis.recommendedServiceSize.recommendedAmps}A
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={loadAnalysis.recommendedServiceSize.utilizationPercent}
                  color={getLoadUtilizationColor(loadAnalysis.recommendedServiceSize.utilizationPercent)}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {loadAnalysis.recommendedServiceSize.utilizationPercent}% utilization
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Room Analysis */}
      <Accordion 
        expanded={expandedSection === 'rooms'} 
        onChange={handleAccordionChange('rooms')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">🏠 Room Analysis</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {Object.values(roomAnalysis).map((room) => (
              <ListItem key={room.roomName} divider>
                <ListItemIcon>
                  {getComplianceIcon(room.compliance.score)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        {room.roomName}
                      </Typography>
                      <Typography variant="caption">
                        {formatLoad(room.loads.total)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        {room.components} components • Compliance: {room.compliance.score}%
                      </Typography>
                      {room.compliance.violations.length > 0 && (
                        <Chip 
                          size="small" 
                          label={`${room.compliance.violations.length} violations`}
                          color="error"
                          sx={{ mr: 0.5, mt: 0.5 }}
                        />
                      )}
                      {room.compliance.warnings.length > 0 && (
                        <Chip 
                          size="small" 
                          label={`${room.compliance.warnings.length} warnings`}
                          color="warning"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* Load Breakdown */}
      <Accordion 
        expanded={expandedSection === 'breakdown'} 
        onChange={handleAccordionChange('breakdown')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">⚡ Load Breakdown</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LightIcon sx={{ mr: 1, fontSize: 'small' }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Lighting ({loadAnalysis.componentCounts.lights} fixtures)
              </Typography>
              <Typography variant="body2">
                {formatLoad(loadAnalysis.connectedLoad.lighting)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <OutletIcon sx={{ mr: 1, fontSize: 'small' }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Outlets ({loadAnalysis.componentCounts.outlets} outlets)
              </Typography>
              <Typography variant="body2">
                {formatLoad(loadAnalysis.connectedLoad.outlets)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ApplianceIcon sx={{ mr: 1, fontSize: 'small' }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Appliances ({loadAnalysis.componentCounts.appliances} appliances)
              </Typography>
              <Typography variant="body2">
                {formatLoad(loadAnalysis.connectedLoad.appliances)}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                Diversity Factor:
              </Typography>
              <Typography variant="body2" color="primary">
                {loadAnalysis.diversityFactor}%
              </Typography>
            </Box>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="caption">
                Demand calculations follow NEC Article 220 standards for residential loads.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Circuit Recommendations */}
      <Accordion 
        expanded={expandedSection === 'circuits'} 
        onChange={handleAccordionChange('circuits')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">🔌 Circuit Recommendations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {Object.values(roomAnalysis).map((room) => (
              <Box key={room.roomName}>
                <Typography variant="subtitle2" gutterBottom>
                  {room.roomName}
                </Typography>
                {room.recommendedCircuits.map((rec, index) => (
                  <ListItem key={index} sx={{ pl: 2 }}>
                    <ListItemIcon>
                      {rec.type === 'lighting' ? <LightIcon fontSize="small" /> :
                       rec.type === 'outlets' ? <OutletIcon fontSize="small" /> :
                       <ApplianceIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={rec.description}
                      secondary={`${formatLoad(rec.totalLoad)} • ${rec.components} components`}
                    />
                  </ListItem>
                ))}
                <Divider sx={{ my: 1 }} />
              </Box>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>

      {/* NEC Compliance */}
      <Accordion 
        expanded={expandedSection === 'compliance'} 
        onChange={handleAccordionChange('compliance')}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">📋 NEC Compliance</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List dense>
            {Object.values(roomAnalysis).map((room) => (
              <Box key={room.roomName}>
                <Typography variant="subtitle2" gutterBottom>
                  {room.roomName}
                </Typography>
                
                {room.compliance.violations.map((violation, index) => (
                  <Alert key={index} severity="error" sx={{ mb: 1 }}>
                    <Typography variant="caption">
                      {violation}
                    </Typography>
                  </Alert>
                ))}
                
                {room.compliance.warnings.map((warning, index) => (
                  <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                    <Typography variant="caption">
                      {warning}
                    </Typography>
                  </Alert>
                ))}
                
                {room.compliance.violations.length === 0 && room.compliance.warnings.length === 0 && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    <Typography variant="caption">
                      All requirements met
                    </Typography>
                  </Alert>
                )}
                
                <Divider sx={{ my: 1 }} />
              </Box>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // Return content wrapped in Paper for standalone mode, or just content for embedded mode
  if (embedded) {
    return content;
  }

  return (
    <Paper 
      sx={{ 
        position: 'fixed',
        right: 16,
        top: 120,
        bottom: 16,
        width: 350,
        overflow: 'auto',
        zIndex: 1000,
        p: 2,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {content}
    </Paper>
  );
};

export default LoadAnalysisPanel; 