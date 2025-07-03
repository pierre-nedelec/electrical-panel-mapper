// src/components/FloorPlanManager.js
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Box,
  Typography, 
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  loadFloorPlansFromServer, 
  deleteFloorPlanFromServer,
  loadFloorPlansLocal,
  deleteFloorPlanLocal
} from '../utils/floorPlanUtils';

const FloorPlanManager = ({ open, onClose, onSelectPlan, onEditPlan }) => {
  const [savedPlans, setSavedPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, plan: null });
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (open) {
      const loadPlans = async () => {
        setLoading(true);
        try {
          // Try to load from server first
          const serverPlans = await loadFloorPlansFromServer();
          setSavedPlans(serverPlans);
        } catch (error) {
          // Fallback to localStorage if server is unavailable
          console.warn('Server unavailable, using local storage');
          const localPlans = loadFloorPlansLocal();
          setSavedPlans(localPlans);
        } finally {
          setLoading(false);
        }
      };
      
      loadPlans();
    }
  }, [open]);

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleDeleteClick = (plan) => {
    setDeleteConfirmDialog({ open: true, plan });
  };

  const handleConfirmDelete = async () => {
    const { plan } = deleteConfirmDialog;
    if (!plan) return;

    try {
      // Try to delete from server first
      await deleteFloorPlanFromServer(plan.id);
      const updatedPlans = savedPlans.filter(p => p.id !== plan.id);
      setSavedPlans(updatedPlans);
      showNotification(`Floor plan "${plan.name}" deleted successfully`, 'info');
    } catch (error) {
      // Fallback to localStorage
      console.warn('Server delete failed, using local storage');
      const updatedPlans = deleteFloorPlanLocal(plan.id);
      setSavedPlans(updatedPlans);
      showNotification(`Floor plan "${plan.name}" deleted locally`, 'warning');
    }
    
    setDeleteConfirmDialog({ open: false, plan: null });
  };

  const handleSelectPlan = (plan) => {
    // Convert saved plan to the format expected by MainScreen
    const floorPlan = {
      id: plan.id,
      viewBox: plan.view_box || plan.viewBox,
      svg: plan.svg_content || plan.svg,
      name: plan.name,
      rooms: plan.rooms || []
    };
    onSelectPlan(floorPlan);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Your Saved Floor Plans</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Loading floor plans...
            </Typography>
          </Box>
        ) : savedPlans.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No saved floor plans found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create and save floor plans using the "Draw Your Own" option.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {savedPlans.map((plan) => (
              <Grid item xs={12} sm={6} md={4} key={plan.id}>
                <Card>
                  <CardContent>
                    <Box 
                      sx={{ 
                        height: 120, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 2,
                        overflow: 'hidden'
                      }}
                    >
                      <svg 
                        viewBox={plan.view_box || plan.viewBox} 
                        style={{ width: '100%', height: '100%' }}
                        dangerouslySetInnerHTML={{ __html: plan.svg_content || plan.svg }}
                      />
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {plan.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip 
                        label={`${plan.rooms?.length || 0} rooms`} 
                        size="small" 
                        variant="outlined" 
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      Created: {plan.created_at ? new Date(plan.created_at).toLocaleDateString() : 'Unknown'}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      View Plan
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => onEditPlan && onEditPlan(plan)}
                    >
                      Edit
                    </Button>
                    <Button 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteClick(plan)}
                    >
                      Delete
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog
      open={deleteConfirmDialog.open}
      onClose={() => setDeleteConfirmDialog({ open: false, plan: null })}
      maxWidth="sm"
    >
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete the floor plan <strong>"{deleteConfirmDialog.plan?.name}"</strong>?
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmDialog({ open: false, plan: null })}>
          Cancel
        </Button>
        <Button 
          onClick={handleConfirmDelete} 
          color="error" 
          variant="contained"
          autoFocus
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>

    {/* Notification Snackbar */}
    <Snackbar
      open={notification.open}
      autoHideDuration={4000}
      onClose={() => setNotification({ ...notification, open: false })}
    >
      <Alert 
        severity={notification.severity} 
        onClose={() => setNotification({ ...notification, open: false })}
      >
        {notification.message}
      </Alert>
    </Snackbar>
    </>
  );
};

export default FloorPlanManager;
