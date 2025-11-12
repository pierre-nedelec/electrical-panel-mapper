// src/components/Settings.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  LocalFireDepartment as ApplianceIcon
} from '@mui/icons-material';
import config from '../config';
import deviceTypesService from '../services/deviceTypesService';
import { getIconComponent, availableIcons } from '../utils/iconMapping';

const Settings = ({ darkMode, onClose }) => {
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'appliance',
    icon: 'LocalFireDepartment',
    default_wattage: 0,
    default_voltage: 120,
    default_amperage: 15,
    requires_gfci: false,
    requires_afci: false
  });

  useEffect(() => {
    loadDeviceTypes();
  }, []);

  const loadDeviceTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/device-types`);
      if (!response.ok) {
        throw new Error(`Failed to load device types: ${response.statusText}`);
      }
      const data = await response.json();
      setDeviceTypes(data);
      
      // Clear device types cache to force refresh
      deviceTypesService.deviceTypes = null;
    } catch (err) {
      console.error('Error loading device types:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAddNew = () => {
    setSelectedDeviceType(null);
    setFormData({
      name: '',
      category: 'appliance',
      icon: 'LocalFireDepartment',
      default_wattage: 0,
      default_voltage: 120,
      default_amperage: 15,
      requires_gfci: false,
      requires_afci: false
    });
    setEditDialogOpen(true);
  };

  const handleEdit = (deviceType) => {
    setSelectedDeviceType(deviceType);
    setFormData({
      name: deviceType.name,
      category: deviceType.category,
      icon: deviceType.icon || 'LocalFireDepartment',
      default_wattage: deviceType.default_wattage || 0,
      default_voltage: deviceType.default_voltage || 120,
      default_amperage: deviceType.default_amperage || 15,
      requires_gfci: deviceType.requires_gfci || false,
      requires_afci: deviceType.requires_afci || false
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (deviceType) => {
    setSelectedDeviceType(deviceType);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      const url = selectedDeviceType
        ? `${config.BACKEND_URL}/api/device-types/${selectedDeviceType.id}`
        : `${config.BACKEND_URL}/api/device-types`;
      
      const method = selectedDeviceType ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save device type');
      }

      await loadDeviceTypes();
      setEditDialogOpen(false);
      setSelectedDeviceType(null);
      setError(null);
    } catch (err) {
      console.error('Error saving device type:', err);
      setError(err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeviceType) return;

    try {
      const response = await fetch(
        `${config.BACKEND_URL}/api/device-types/${selectedDeviceType.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete device type');
      }

      await loadDeviceTypes();
      setDeleteDialogOpen(false);
      setSelectedDeviceType(null);
      setError(null);
    } catch (err) {
      console.error('Error deleting device type:', err);
      setError(err.message);
    }
  };

  const filteredDeviceTypes = deviceTypes.filter(dt => {
    if (tabValue === 0) return dt.category === 'appliance';
    if (tabValue === 1) return dt.is_custom;
    return true;
  });

  const categories = ['appliance', 'lighting', 'receptacle', 'control', 'heating', 'hvac'];
  const getCategoryLabel = (category) => {
    const labels = {
      appliance: 'Appliance',
      lighting: 'Lighting',
      receptacle: 'Receptacle',
      control: 'Control',
      heating: 'Heating',
      hvac: 'HVAC'
    };
    return labels[category] || category;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
        {onClose && (
          <Button
            onClick={onClose}
            sx={{ ml: 'auto' }}
            variant="outlined"
          >
            Close
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Appliances" />
              <Tab label="Custom Types" />
              <Tab label="All Types" />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {tabValue === 0 && 'Appliances'}
              {tabValue === 1 && 'Custom Device Types'}
              {tabValue === 2 && 'All Device Types'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              Add New
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Icon</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Wattage</TableCell>
                    <TableCell align="right">Voltage</TableCell>
                    <TableCell align="right">Amperage</TableCell>
                    <TableCell>GFCI</TableCell>
                    <TableCell>AFCI</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDeviceTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <Typography color="textSecondary">
                          No device types found. Click "Add New" to create one.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDeviceTypes.map((deviceType) => {
                      const IconComponent = getIconComponent(deviceType.icon);
                      return (
                      <TableRow key={deviceType.id} hover>
                        <TableCell>
                          <IconComponent fontSize="small" color="action" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {deviceType.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getCategoryLabel(deviceType.category)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {deviceType.default_wattage || 0} W
                        </TableCell>
                        <TableCell align="right">
                          {deviceType.default_voltage || 120} V
                        </TableCell>
                        <TableCell align="right">
                          {deviceType.default_amperage || 15} A
                        </TableCell>
                        <TableCell>
                          {deviceType.requires_gfci ? (
                            <Chip label="Yes" color="success" size="small" />
                          ) : (
                            <Typography variant="body2" color="textSecondary">No</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {deviceType.requires_afci ? (
                            <Chip label="Yes" color="success" size="small" />
                          ) : (
                            <Typography variant="body2" color="textSecondary">No</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {deviceType.is_custom ? (
                            <Chip label="Custom" color="primary" size="small" />
                          ) : (
                            <Chip label="System" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(deviceType)}
                            disabled={!deviceType.is_custom}
                            title={deviceType.is_custom ? 'Edit' : 'System types cannot be edited'}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(deviceType)}
                            disabled={!deviceType.is_custom}
                            color="error"
                            title={deviceType.is_custom ? 'Delete' : 'System types cannot be deleted'}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedDeviceType ? 'Edit Appliance' : 'Add New Appliance'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Category"
              select
              SelectProps={{ native: true }}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </TextField>
            
            {/* Icon Picker */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Icon
              </Typography>
              <Box sx={{ 
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                maxHeight: 300,
                overflow: 'auto',
                bgcolor: 'background.default'
              }}>
                <Grid container spacing={1}>
                  {availableIcons.map((iconOption, index) => {
                    const IconComp = getIconComponent(iconOption.name);
                    const isSelected = formData.icon === iconOption.name;
                    return (
                      <Grid item xs={3} sm={2} key={iconOption.id || `${iconOption.name}-${index}`}>
                        <Tooltip title={iconOption.label} arrow>
                          <Box
                            onClick={() => setFormData({ ...formData, icon: iconOption.name })}
                            sx={{
                              p: 1.5,
                              border: '2px solid',
                              borderColor: isSelected ? 'primary.main' : 'transparent',
                              borderRadius: 1,
                              bgcolor: isSelected ? 'action.selected' : 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.5,
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: isSelected ? 'primary.main' : 'divider'
                              },
                              transition: 'all 0.2s'
                            }}
                          >
                            <IconComp 
                              fontSize="small" 
                              color={isSelected ? 'primary' : 'action'}
                            />
                            <Typography variant="caption" sx={{ fontSize: '0.65rem', textAlign: 'center' }}>
                              {iconOption.label}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                {formData.icon && (
                  <>
                    <Typography variant="caption" color="textSecondary">
                      Selected:
                    </Typography>
                    {React.createElement(getIconComponent(formData.icon), { fontSize: 'small' })}
                    <Typography variant="caption" color="textSecondary">
                      {availableIcons.find(i => i.name === formData.icon)?.label || formData.icon}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
            <TextField
              label="Default Wattage (W)"
              type="number"
              value={formData.default_wattage}
              onChange={(e) => setFormData({ ...formData, default_wattage: parseInt(e.target.value) || 0 })}
              fullWidth
            />
            <TextField
              label="Default Voltage (V)"
              type="number"
              value={formData.default_voltage}
              onChange={(e) => setFormData({ ...formData, default_voltage: parseInt(e.target.value) || 120 })}
              fullWidth
            />
            <TextField
              label="Default Amperage (A)"
              type="number"
              value={formData.default_amperage}
              onChange={(e) => setFormData({ ...formData, default_amperage: parseInt(e.target.value) || 15 })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requires_gfci}
                  onChange={(e) => setFormData({ ...formData, requires_gfci: e.target.checked })}
                />
              }
              label="Requires GFCI Protection"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.requires_afci}
                  onChange={(e) => setFormData({ ...formData, requires_afci: e.target.checked })}
                />
              }
              label="Requires AFCI Protection"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {selectedDeviceType ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDeviceType?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Settings;

