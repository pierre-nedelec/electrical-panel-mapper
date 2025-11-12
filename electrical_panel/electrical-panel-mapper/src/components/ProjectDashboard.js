import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Home as HomeIcon,
  ElectricalServices as ElectricalIcon,
  Map as MapIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import config from '../config';

const ProjectDashboard = ({ onStartProject, onResumeProject, onEditProject }) => {
  const [savedProjects, setSavedProjects] = useState([]);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  // Add delete confirmation dialog state
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, project: null });
  const [deleting, setDeleting] = useState(false);

  // Load saved projects on mount
  useEffect(() => {
    loadSavedProjects();
  }, []);

  const loadSavedProjects = async () => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/floor-plans`);
      if (response.ok) {
        const plans = await response.json();
        
        // Get additional data for each project
        const projectsWithStatus = await Promise.all(
          plans.map(async (plan) => {
            try {
              // Get panels count
              const panelsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/panels?floor_plan_id=${plan.id}`);
              const panels = panelsResponse.ok ? await panelsResponse.json() : [];
              
              // Get components count  
              const componentsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/components?floor_plan_id=${plan.id}`);
              const components = componentsResponse.ok ? await componentsResponse.json() : [];
              
              // Parse rooms data
              const rooms = JSON.parse(plan.rooms_data || '[]');
              
              // Determine project completion status
              const hasRooms = rooms.length > 0;
              const hasPanels = panels.length > 0;
              const hasComponents = components.length > 0;
              
              let step = 1;
              if (hasRooms) step = 2;
              if (hasPanels) step = 3;
              
              const complete = hasRooms && hasPanels && hasComponents;
              
              return {
                ...plan,
                status: {
                  step,
                  complete,
                  hasRooms,
                  hasPanels,
                  hasComponents,
                  panelCount: panels.length,
                  componentCount: components.length
                }
              };
            } catch (error) {
              console.warn(`Failed to load status for project ${plan.id}:`, error);
              return {
                ...plan,
                status: { step: 1, complete: false }
              };
            }
          })
        );
        
        setSavedProjects(projectsWithStatus);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeProjectStatus = async (project) => {
    try {
      // Check for electrical panels
      let hasPanels = false;
      let panelCount = 0;
      try {
        const panelsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/panels?floor_plan_id=${project.id}`);
        if (panelsResponse.ok) {
          const panels = await panelsResponse.json();
          panelCount = panels.length;
          hasPanels = panelCount > 0;
        }
      } catch (error) {
        console.error('Error checking panels:', error);
      }

      // Check for electrical components
      let hasComponents = false;
      let componentCount = 0;
      try {
        const componentsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/components?floor_plan_id=${project.id}`);
        if (componentsResponse.ok) {
          const components = await componentsResponse.json();
          componentCount = components.length;
          hasComponents = componentCount > 0;
        }
      } catch (error) {
        console.error('Error checking components:', error);
      }

      // Check for rooms (basic floor plan setup)
      const hasRooms = project.svg_content && project.svg_content.length > 0;

      // Determine current step
      let step = 1;
      let complete = false;

      if (!hasRooms) {
        step = 1; // Floor plan setup
      } else if (!hasPanels) {
        step = 2; // Panel configuration
      } else if (!hasComponents) {
        step = 3; // Component mapping
      } else {
        step = 3;
        complete = true; // All steps completed
      }

      return {
        step,
        complete,
        hasRooms,
        hasPanels,
        hasComponents,
        panelCount,
        componentCount
      };
    } catch (error) {
      // Return safe defaults for any errors
      return {
        step: 1,
        complete: false,
        hasRooms: false,
        hasPanels: false,
        hasComponents: false,
        panelCount: 0,
        componentCount: 0
      };
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch(`${config.BACKEND_URL}/api/floor-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          rooms_data: '[]',
          view_box: '0 0 500 400',
          svg_content: ''
        })
      });

      if (response.ok) {
        const newProject = await response.json();
        onStartProject({ ...newProject, status: { step: 1, complete: false } });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      // Fallback to local creation
      const newProject = {
        id: Date.now(),
        name: newProjectName,
        created_at: new Date().toISOString(),
        status: { step: 1, complete: false }
      };
      onStartProject(newProject);
    }

    setShowNewProjectDialog(false);
    setNewProjectName('');
  };

  // NEW: Handle delete project with confirmation
  const handleDeleteProject = (project) => {
    setDeleteConfirmDialog({ open: true, project });
  };

  const confirmDeleteProject = async () => {
    const { project } = deleteConfirmDialog;
    if (!project) return;

    setDeleting(true);
    try {
      console.log(`🗑️ Deleting floor plan: ${project.name} (ID: ${project.id})`);
      
      const response = await fetch(`${config.BACKEND_URL}/api/floor-plans/${project.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Delete result:', result);
        
        // Remove from local state
        setSavedProjects(prev => prev.filter(p => p.id !== project.id));
        
        // Show success message (you could add a toast/snackbar here)
        console.log(`🎉 Successfully deleted "${project.name}" and all associated data`);
        
        // Reload projects to ensure consistency
        await loadSavedProjects();
      } else {
        const error = await response.json();
        console.error('❌ Delete failed:', error);
        alert(`Failed to delete project: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error during delete:', error);
      alert(`Error deleting project: ${error.message}`);
    } finally {
      setDeleting(false);
      setDeleteConfirmDialog({ open: false, project: null });
    }
  };

  const cancelDeleteProject = () => {
    setDeleteConfirmDialog({ open: false, project: null });
  };

  const getStepIcon = (step) => {
    switch (step) {
      case 1: return <HomeIcon />;
      case 2: return <ElectricalIcon />;
      case 3: return <MapIcon />;
      default: return <HomeIcon />;
    }
  };

  const getStepLabel = (step) => {
    switch (step) {
      case 1: return 'Floor Plan';
      case 2: return 'Panel Setup';
      case 3: return 'Component Mapping';
      default: return 'Floor Plan';
    }
  };

  const getProjectStatusChip = (status) => {
    if (status.complete) {
      return <Chip icon={<CheckIcon />} label="Complete" color="success" size="small" />;
    }

    return (
      <Chip
        icon={getStepIcon(status.step)}
        label={`Step ${status.step}: ${getStepLabel(status.step)}`}
        color="primary"
        variant="outlined"
        size="small"
      />
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>Loading projects...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Electrical Panel Mapper
        </Typography>
        <Typography variant="h6" color="textSecondary" sx={{ mb: 3 }}>
          Map your home's electrical systems step by step
        </Typography>

        {/* Workflow Steps */}
        <Card sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
          <CardContent>
            <Stepper orientation="horizontal" alternativeLabel>
              <Step completed>
                <StepLabel icon={<HomeIcon />}>
                  Floor Plan
                </StepLabel>
              </Step>
              <Step>
                <StepLabel icon={<ElectricalIcon />}>
                  Panel Setup
                </StepLabel>
              </Step>
              <Step>
                <StepLabel icon={<MapIcon />}>
                  Component Mapping
                </StepLabel>
              </Step>
            </Stepper>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={4}>
        {/* Create New Project */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Start New Project
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                Create a new electrical mapping project. Each project contains one floor plan with its electrical system.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setShowNewProjectDialog(true)}
              >
                Create New Project
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Projects */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Your Projects
              </Typography>

              {savedProjects.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography color="textSecondary">
                    No projects yet. Create your first project to get started!
                  </Typography>
                </Box>
              ) : (
                <List>
                  {savedProjects.slice(0, 5).map((project) => (
                    <ListItem key={project.id} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" component="span">
                              {project.name}
                            </Typography>
                            {getProjectStatusChip(project.status)}
                          </Box>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography variant="caption" color="textSecondary" component="div">
                              Created: {new Date(project.created_at).toLocaleDateString()}
                            </Typography>
                            {project.status && (
                              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                                {project.status.hasRooms && `${JSON.parse(project.rooms_data || '[]').length} rooms`}
                                {project.status.hasPanels && ` • ${project.status.panelCount} panels`}
                                {project.status.hasComponents && ` • ${project.status.componentCount} components`}
                              </Typography>
                            )}
                          </React.Fragment>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          size="small"
                          startIcon={<PlayIcon />}
                          onClick={() => onResumeProject(project)}
                          sx={{ mr: 1 }}
                        >
                          {project.status?.complete ? 'View' : 'Continue'}
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => onEditProject(project)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteProject(project)}
                          color="error"
                          title={`Delete "${project.name}"`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}

              {savedProjects.length > 5 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button variant="text" size="small">
                    View All Projects ({savedProjects.length})
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Project Dialog */}
      <Dialog
        open={showNewProjectDialog}
        onClose={() => setShowNewProjectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Project Name"
            placeholder="e.g., My House, Office Building, Apartment 3B"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateProject();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewProjectDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateProject}
            variant="contained"
            disabled={!newProjectName.trim()}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={cancelDeleteProject}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: 'error.main' }}>
          ⚠️ Confirm Project Deletion
        </DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description" sx={{ mb: 2 }}>
            Are you sure you want to permanently delete the project "{deleteConfirmDialog.project?.name}"?
          </Typography>
          
          {deleteConfirmDialog.project?.status && (
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                This will delete ALL associated data:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <Typography component="li" variant="body2">
                  Floor plan and {JSON.parse(deleteConfirmDialog.project?.rooms_data || '[]').length} rooms
                </Typography>
                {deleteConfirmDialog.project.status.componentCount > 0 && (
                  <Typography component="li" variant="body2">
                    {deleteConfirmDialog.project.status.componentCount} electrical components
                  </Typography>
                )}
                {deleteConfirmDialog.project.status.panelCount > 0 && (
                  <Typography component="li" variant="body2">
                    {deleteConfirmDialog.project.status.panelCount} electrical panels and all circuits
                  </Typography>
                )}
                <Typography component="li" variant="body2">
                  All materials lists and code compliance records
                </Typography>
              </Box>
            </Box>
          )}
          
          <Typography variant="body2" color="error" sx={{ fontWeight: 'bold' }}>
            ⚠️ This action cannot be undone!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteProject} color="primary" variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteProject} 
            color="error" 
            variant="contained" 
            disabled={deleting}
            startIcon={deleting ? null : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectDashboard;