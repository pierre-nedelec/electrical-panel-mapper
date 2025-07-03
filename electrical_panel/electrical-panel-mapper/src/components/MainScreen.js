// src/components/MainScreen.js
import React, { useRef, useState } from 'react';
import { Container, Box, Button, Typography, Card, CardContent, Grid, Breadcrumbs, Link, Chip } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import EditIcon from '@mui/icons-material/Edit';
import MenuBar from './MenuBar';
import MapViewer from './MapViewer';
import TemplateSelector from './TemplateSelector';
import FloorPlanDrawer from './FloorPlanDrawer';
import FloorPlanManager from './FloorPlanManager';
import useZoom from '../hooks/useZoom';

const initialViewBox = '0 0 500 400';

function MainScreen({ toggleDarkMode, darkMode }) {
  const { viewBox, setViewBox } = useZoom(initialViewBox);
  const svgRef = useRef(null);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showFloorPlanDrawer, setShowFloorPlanDrawer] = useState(false);
  const [showFloorPlanManager, setShowFloorPlanManager] = useState(false);
  const [currentFloorPlan, setCurrentFloorPlan] = useState(null);

  const handleSelectTemplate = (template) => {
    setCurrentFloorPlan(template);
    setHasFloorPlan(true);
    setShowTemplateSelector(false);
  };

  const handleSaveFloorPlan = (floorPlan) => {
    setCurrentFloorPlan(floorPlan);
    setHasFloorPlan(true);
    setShowFloorPlanDrawer(false);
  };

  const handleSelectPlan = (floorPlan) => {
    setCurrentFloorPlan(floorPlan);
    setHasFloorPlan(true);
    setShowFloorPlanManager(false);
  };

  const handleEditPlan = (floorPlan) => {
    setCurrentFloorPlan(floorPlan);
    setShowFloorPlanDrawer(true);
    setShowFloorPlanManager(false);
  };

  const handleStartOver = () => {
    setHasFloorPlan(false);
    setCurrentFloorPlan(null);
  };

  if (!hasFloorPlan) {
    return (
      <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <MenuBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} title="Electrical Panel Mapper" />
        
        {showFloorPlanDrawer ? (
          <Box mt={2} flexGrow={1}>
            <FloorPlanDrawer 
              onSaveFloorPlan={handleSaveFloorPlan} 
              initialFloorPlan={currentFloorPlan}
            />
          </Box>
        ) : (
          <Box mt={4} flexGrow={1} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Welcome to Electrical Panel Mapper
            </Typography>
            <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4, maxWidth: 600 }}>
              Map your home's electrical systems by placing lights, outlets, and other devices on your floor plan. 
              Start by choosing a template or drawing your own floor plan.
            </Typography>

            <Grid container spacing={3} sx={{ maxWidth: 800 }}>
              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => setShowTemplateSelector(true)}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      📋 Use Template
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Choose from pre-made floor plan templates including apartments, houses, and studios.
                    </Typography>
                    <Button variant="contained" sx={{ mt: 2 }}>
                      Browse Templates
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => setShowFloorPlanDrawer(true)}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      ✏️ Draw Your Own
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Create a custom floor plan by drawing rooms with our simple point-and-click tool.
                    </Typography>
                    <Button variant="contained" sx={{ mt: 2 }}>
                      Start Drawing
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => setShowFloorPlanManager(true)}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      💾 Saved Plans
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Load one of your previously saved floor plans to continue working.
                    </Typography>
                    <Button variant="contained" sx={{ mt: 2 }}>
                      View Saved
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card sx={{ height: '100%', cursor: 'pointer' }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      📁 Upload SVG
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Have an existing floor plan? Upload your SVG file to get started immediately.
                    </Typography>
                    <Button variant="outlined" sx={{ mt: 2 }} disabled>
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        <TemplateSelector
          open={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelectTemplate={handleSelectTemplate}
        />

        <FloorPlanManager
          open={showFloorPlanManager}
          onClose={() => setShowFloorPlanManager(false)}
          onSelectPlan={handleSelectPlan}
          onEditPlan={handleEditPlan}
        />
      </Container>
    );
  }

  const getTitle = () => {
    if (currentFloorPlan?.name) {
      return `Electrical Panel Mapper - ${currentFloorPlan.name}`;
    }
    return "Electrical Panel Mapper";
  };

  return (
    <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MenuBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} title={getTitle()}>
        <Chip 
          icon={<EditIcon />}
          label="Viewing Mode" 
          variant="outlined" 
          color="primary" 
          size="small"
          sx={{ mr: 2 }}
        />
        <Button color="inherit" onClick={handleStartOver}>
          Change Floor Plan
        </Button>
      </MenuBar>
      
      {/* Breadcrumbs */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Breadcrumbs>
          <Link 
            color="inherit" 
            href="#" 
            onClick={handleStartOver}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography color="text.primary">
            {currentFloorPlan?.name || 'Floor Plan'}
          </Typography>
        </Breadcrumbs>
      </Box>
      
      <Box mt={2} flexGrow={1} display="flex" justifyContent="center" position="relative" overflow="hidden">
        <MapViewer
          ref={svgRef}
          viewBox={currentFloorPlan?.view_box || currentFloorPlan?.viewBox || viewBox}
          setViewBox={setViewBox}
          darkMode={darkMode}
          onMouseMove={() => {}}
          onClick={() => {}}
        >
          {currentFloorPlan && (
            <g dangerouslySetInnerHTML={{ __html: currentFloorPlan.svg_content || currentFloorPlan.svg }} />
          )}
        </MapViewer>
      </Box>
    </Container>
  );
}

export default MainScreen;
