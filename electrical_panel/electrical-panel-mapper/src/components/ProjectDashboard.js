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

  // Load saved projects on mount
  useEffect(() => {
    loadSavedProjects();
  }, []);

  const loadSavedProjects = async () => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/floor-plans`);
      if (response.ok) {
        const projects = await response.json();
        // Add project status analysis
        const projectsWithStatus = await Promise.all(
          projects.map(async (project) => {
            const status = await analyzeProjectStatus(project);
            return { ...project, status };
          })
        );
        setSavedProjects(projectsWithStatus);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      // Fallback to localStorage
      const localProjects = JSON.parse(localStorage.getItem('floorPlans') || '[]');
      setSavedProjects(localProjects.map(p => ({ ...p, status: { step: 1, complete: false } })));
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
                        >
                          <EditIcon />
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
    </Container>
  );
};

export default ProjectDashboard;