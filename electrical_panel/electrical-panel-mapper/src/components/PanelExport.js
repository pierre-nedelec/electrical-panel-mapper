import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Visibility as PreviewIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  ElectricalServices as PanelIcon,
  Assessment as ReportIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import config from '../config';

const PanelExport = ({
  project,
  onComplete,
  onBackToMapping,
  darkMode = false
}) => {
  const [exportData, setExportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const printRef = useRef();

  useEffect(() => {
    loadExportData();
  }, [project]);

  const loadExportData = async () => {
    if (!project?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${config.BACKEND_URL}/api/electrical/export/panel-schedule/${project.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load export data');
      }

      const data = await response.json();
      setExportData(data);

      // Select first panel by default
      if (data.panels && data.panels.length > 0) {
        setSelectedPanel(data.panels[0]);
      }
    } catch (err) {
      console.error('Export data loading error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // For now, use browser's print to PDF functionality
    // In the future, this could be enhanced with a proper PDF library
    window.print();
  };

  const formatBreakerPosition = (circuit) => {
    if (circuit.secondary_position) {
      return `${circuit.breaker_position}-${circuit.secondary_position}`;
    }
    return circuit.breaker_position.toString();
  };

  const getBreakerTypeDisplay = (breakerType) => {
    const types = {
      'single': 'Single Pole',
      'double': 'Double Pole',
      'gfci': 'GFCI',
      'afci': 'AFCI',
      'gfci_double': 'GFCI Double Pole'
    };
    return types[breakerType] || breakerType;
  };

  const getCompletionStatus = () => {
    if (!exportData) return { canProceed: false };
    
    const hasData = exportData.panels.length > 0 && 
                   exportData.summary.total_circuits > 0;
    
    return {
      canProceed: hasData,
      totalPanels: exportData.panels.length,
      totalCircuits: exportData.summary.total_circuits,
      totalComponents: exportData.summary.total_components
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading panel export data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading export data: {error}
        </Alert>
        <Button variant="outlined" onClick={loadExportData}>
          Retry
        </Button>
      </Container>
    );
  }

  const status = getCompletionStatus();

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter landscape;
          }
          
          body * {
            visibility: hidden;
          }
          .printable-content, .printable-content * {
            visibility: visible;
          }
          .printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            font-family: 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #000;
          }
          .no-print {
            display: none !important;
          }
          .print-page-break {
            page-break-before: always;
          }
          
          /* Table styling for professional appearance with better column sizing */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 8pt 0;
            table-layout: fixed;
          }
          
          /* Specific column widths to prevent overflow */
          .circuit-table th:nth-child(1), .circuit-table td:nth-child(1) { width: 8%; }  /* Breaker # */
          .circuit-table th:nth-child(2), .circuit-table td:nth-child(2) { width: 8%; }  /* Amps */
          .circuit-table th:nth-child(3), .circuit-table td:nth-child(3) { width: 8%; }  /* Voltage */
          .circuit-table th:nth-child(4), .circuit-table td:nth-child(4) { width: 10%; } /* Wire */
          .circuit-table th:nth-child(5), .circuit-table td:nth-child(5) { width: 12%; } /* Type */
          .circuit-table th:nth-child(6), .circuit-table td:nth-child(6) { width: 46%; } /* Description */
          .circuit-table th:nth-child(7), .circuit-table td:nth-child(7) { width: 8%; }  /* Load */
          
          th {
            background-color: #f0f0f0 !important;
            border: 1px solid #000;
            padding: 4pt 6pt;
            text-align: left;
            font-weight: bold;
            font-size: 9pt;
            word-wrap: break-word;
          }
          td {
            border: 1px solid #000;
            padding: 3pt 6pt;
            text-align: left;
            font-size: 8pt;
            vertical-align: top;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          /* Header styling */
          h1, h2, h3, h4, h5, h6 {
            color: #000;
            margin: 8pt 0 4pt 0;
            font-family: 'Arial', sans-serif;
          }
          h1 { font-size: 16pt; text-align: center; font-weight: bold; }
          h2 { font-size: 14pt; font-weight: bold; }
          h3 { font-size: 12pt; font-weight: bold; }
          h4 { font-size: 10pt; font-weight: bold; }
          h5 { font-size: 9pt; font-weight: bold; }
          h6 { font-size: 8pt; font-weight: bold; }
          
          /* Card styling */
          .MuiCard-root {
            border: 1px solid #ccc;
            box-shadow: none !important;
            margin: 6pt 0;
            page-break-inside: avoid;
          }
          
          /* Grid and layout */
          .MuiGrid-container {
            margin: 3pt 0;
          }
          .MuiGrid-item {
            padding: 3pt !important;
          }
          
          /* Typography */
          .MuiTypography-root {
            color: #000 !important;
            margin: 2pt 0 !important;
          }
          .MuiTypography-h4 { font-size: 16pt !important; }
          .MuiTypography-h5 { font-size: 12pt !important; }
          .MuiTypography-h6 { font-size: 10pt !important; }
          .MuiTypography-body1 { font-size: 9pt !important; }
          .MuiTypography-body2 { font-size: 8pt !important; }
          .MuiTypography-caption { font-size: 7pt !important; }
          
          /* Chip styling */
          .MuiChip-root {
            border: 1px solid #000;
            background-color: #f8f8f8 !important;
            color: #000 !important;
            font-size: 7pt !important;
            height: auto !important;
            padding: 2pt 4pt !important;
          }
          
          /* Dividers */
          hr, .MuiDivider-root {
            border: none;
            border-top: 1px solid #000;
            margin: 6pt 0;
          }
          
          /* Alert/Notice boxes */
          .MuiAlert-root {
            border: 1px solid #666;
            background-color: #f9f9f9 !important;
            color: #000 !important;
            margin: 4pt 0;
            padding: 4pt;
            font-size: 8pt !important;
          }
          
          /* Box and container spacing */
          .MuiBox-root {
            margin: 2pt 0 !important;
          }
          
          /* CardContent padding */
          .MuiCardContent-root {
            padding: 8pt !important;
          }
        }
      `}</style>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }} className="no-print">
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Panel Schedule Export
          </Typography>
          <Typography variant="h6" color="textSecondary" align="center" sx={{ mb: 3 }}>
            {project.name} - Professional Electrical Documentation
          </Typography>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={!status.canProceed}
            >
              Print Schedule (Landscape)
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportPDF}
              disabled={!status.canProceed}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => setShowInfoDialog(true)}
            >
              Export Info
            </Button>
          </Box>

          {!status.canProceed && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              No electrical data available for export. Please ensure you have completed panel configuration and component mapping.
            </Alert>
          )}
        </Box>

        {/* Printable Content */}
        <div ref={printRef} className="printable-content">
          {exportData && status.canProceed && (
            <>
              {/* Document Header (Prints on every page) */}
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom>
                  Electrical Panel Schedule
                </Typography>
                <Typography variant="h5" color="textSecondary" gutterBottom>
                  {exportData.project_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Generated: {new Date(exportData.export_date).toLocaleDateString()}
                </Typography>
              </Box>

              {/* Project Summary */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Project Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Total Panels</Typography>
                      <Typography variant="h6">{exportData.summary.total_panels}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Total Circuits</Typography>
                      <Typography variant="h6">{exportData.summary.total_circuits}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Total Components</Typography>
                      <Typography variant="h6">{exportData.summary.total_components}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="body2" color="textSecondary">Total Load</Typography>
                      <Typography variant="h6">{exportData.summary.total_load_watts}W</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Panel Schedules */}
              {exportData.panels.map((panel, panelIndex) => (
                <Box key={panel.panel_info.id} className={panelIndex > 0 ? "print-page-break" : ""}>
                  <Card sx={{ mb: 4 }}>
                    <CardContent>
                      {/* Panel Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <PanelIcon sx={{ mr: 1 }} />
                        <Typography variant="h5" component="h2">
                          {panel.panel_info.name}
                        </Typography>
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                          <Chip label={`${panel.panel_info.main_breaker_amps}A Main`} size="small" />
                          <Chip label={`${panel.panel_info.total_positions} Positions`} size="small" />
                          <Chip 
                            label={`${panel.summary.panel_utilization}% Used`} 
                            size="small" 
                            color={panel.summary.panel_utilization > 80 ? "warning" : "default"}
                          />
                        </Box>
                      </Box>

                      {/* Panel Info Grid */}
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="textSecondary">Used Positions</Typography>
                          <Typography variant="body1">{panel.panel_info.used_positions}/{panel.panel_info.total_positions}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="textSecondary">Total Circuits</Typography>
                          <Typography variant="body1">{panel.summary.total_circuits}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="textSecondary">Total Components</Typography>
                          <Typography variant="body1">{panel.summary.total_components}</Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="body2" color="textSecondary">Panel Load</Typography>
                          <Typography variant="body1">{panel.summary.total_load_watts}W</Typography>
                        </Grid>
                      </Grid>

                      <Divider sx={{ mb: 3 }} />

                      {/* Circuit Schedule Table */}
                      <Typography variant="h6" gutterBottom>
                        Circuit Schedule
                      </Typography>
                      
                      {panel.circuits.length === 0 ? (
                        <Alert severity="info">
                          No circuits configured for this panel.
                        </Alert>
                      ) : (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small" className="circuit-table">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Breaker #</strong></TableCell>
                                <TableCell><strong>Amps</strong></TableCell>
                                <TableCell><strong>Voltage</strong></TableCell>
                                <TableCell><strong>Wire</strong></TableCell>
                                <TableCell><strong>Type</strong></TableCell>
                                <TableCell><strong>Circuit Description</strong></TableCell>
                                <TableCell><strong>Load (W)</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {panel.circuits.map((circuit) => (
                                <TableRow key={circuit.breaker_position}>
                                  <TableCell>
                                    <strong>{formatBreakerPosition(circuit)}</strong>
                                  </TableCell>
                                  <TableCell>{circuit.amperage}A</TableCell>
                                  <TableCell>{circuit.voltage}V</TableCell>
                                  <TableCell>{circuit.wire_gauge}</TableCell>
                                  <TableCell>{getBreakerTypeDisplay(circuit.breaker_type)}</TableCell>
                                  <TableCell>
                                    <Box>
                                      {circuit.description ? (
                                        <Typography variant="body2">
                                          {circuit.description}
                                        </Typography>
                                      ) : (
                                        <Typography variant="body2">
                                          {circuit.description || 'Spare'}
                                        </Typography>
                                      )}
                                      {circuit.component_count > 0 && (
                                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                          ({circuit.component_count} component{circuit.component_count !== 1 ? 's' : ''})
                                        </Typography>
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{circuit.total_wattage}W</TableCell>
                                </TableRow>
                              ))}
                              
                              {/* Panel Total Row */}
                              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                <TableCell colSpan={6}>
                                  <strong>PANEL TOTAL</strong>
                                </TableCell>
                                <TableCell>
                                  <strong>{panel.summary.total_load_watts}W</strong>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                      {/* Available Positions */}
                      {panel.panel_info.available_positions > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="textSecondary">
                            Available positions: {panel.panel_info.available_positions} spare breaker slots
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              ))}

              {/* Footer with Notes */}
              <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Notes for Electrician</Typography>
                <Typography variant="body2" paragraph>
                  • This schedule shows current electrical component assignments and load calculations
                </Typography>
                <Typography variant="body2" paragraph>
                  • Special appliances are listed by name where specified
                </Typography>
                <Typography variant="body2" paragraph>
                  • Load calculations are estimates based on component ratings
                </Typography>
                <Typography variant="body2" paragraph>
                  • Verify all connections and loads before making electrical modifications
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                  Generated by Electrical Panel Mapper on {exportData.export_timestamp}
                </Typography>
              </Box>
            </>
          )}
        </div>

        {/* Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, mb: 2 }} className="no-print">
          <Button
            startIcon={<BackIcon />}
            onClick={onBackToMapping}
            variant="outlined"
          >
            Back to Component Mapping
          </Button>

          <Button
            endIcon={<NextIcon />}
            onClick={onComplete}
            variant="contained"
            disabled={!status.canProceed}
          >
            Complete Project
          </Button>
        </Box>
      </Container>

      {/* Info Dialog */}
      <Dialog
        open={showInfoDialog}
        onClose={() => setShowInfoDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Export Information</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            This panel schedule export provides a professional format suitable for:
          </Typography>
          <ul>
            <li>Electrical permit applications</li>
            <li>Contractor consultations</li>
            <li>Home inspection documentation</li>
            <li>Insurance records</li>
            <li>Future electrical planning</li>
          </ul>
          
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            The export includes:
          </Typography>
          <ul>
            <li>Complete breaker schedule for each panel</li>
            <li>Circuit descriptions with component counts</li>
            <li>Special appliances listed by name</li>
            <li>Load calculations and panel utilization</li>
            <li>Wire gauge and breaker type specifications</li>
          </ul>

          {exportData && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Current Project:</strong>
              </Typography>
              <Typography variant="body2">
                {exportData.summary.total_panels} panel(s), {exportData.summary.total_circuits} circuit(s), {exportData.summary.total_components} component(s)
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PanelExport;
