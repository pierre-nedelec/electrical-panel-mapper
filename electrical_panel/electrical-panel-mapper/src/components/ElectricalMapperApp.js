import React, { useState } from 'react';
import { Box, Stepper, Step, StepLabel } from '@mui/material';
import ProjectDashboard from './ProjectDashboard';
import FloorPlanDrawer from './FloorPlanDrawer';
import PanelConfiguration from './PanelConfiguration';
import ComponentMapping from './ComponentMapping';
import PanelExport from './PanelExport';
import MenuBar from './MenuBar';
import Settings from './Settings';

const ElectricalMapperApp = ({ darkMode, toggleDarkMode }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, floorplan, panels, mapping, export, settings
  const [currentProject, setCurrentProject] = useState(null);

  const handleStartProject = (project) => {
    setCurrentProject(project);
    setCurrentView('floorplan');
  };

  const handleResumeProject = (project) => {
    setCurrentProject(project);
    
    // Determine which step to start from based on project status
    if (!project.status.hasRooms) {
      setCurrentView('floorplan');
    } else if (!project.status.hasPanels) {
      setCurrentView('panels');
    } else if (!project.status.hasComponents) {
      setCurrentView('mapping');
    } else {
      setCurrentView('export');
    }
  };

  const handleEditProject = (project) => {
    setCurrentProject(project);
    setCurrentView('floorplan');
  };

  const handleFloorPlanComplete = () => {
    setCurrentView('panels');
  };

  const handlePanelConfigComplete = () => {
    setCurrentView('mapping');
  };

  const handleComponentMappingComplete = () => {
    setCurrentView('export');
  };

  const handleExportComplete = () => {
    // Project is now complete, go back to dashboard
    setCurrentView('dashboard');
  };

  const handleBackToFloorPlan = () => {
    setCurrentView('floorplan');
  };

  const handleBackToPanels = () => {
    setCurrentView('panels');
  };

  const handleBackToMapping = () => {
    setCurrentView('mapping');
  };

  const handleBackToDashboard = () => {
    setCurrentProject(null);
    setCurrentView('dashboard');
  };

  const handleSettingsClick = () => {
    setCurrentView('settings');
  };

  const handleSettingsClose = () => {
    setCurrentView('dashboard');
  };

  const getPageTitle = () => {
    if (!currentProject) return 'Electrical Panel Mapper';
    
    switch (currentView) {
      case 'floorplan':
        return `${currentProject.name} - Floor Plan`;
      case 'panels':
        return `${currentProject.name} - Panel Configuration`;
      case 'mapping':
        return `${currentProject.name} - Component Mapping`;
      case 'export':
        return `${currentProject.name} - Panel Export`;
      default:
        return 'Electrical Panel Mapper';
    }
  };

  const handleStepClick = (step) => {
    if (!currentProject) return;
    
    // Allow navigation to any step
    switch (step) {
      case 0:
        setCurrentView('floorplan');
        break;
      case 1:
        setCurrentView('panels');
        break;
      case 2:
        setCurrentView('mapping');
        break;
      case 3:
        setCurrentView('export');
        break;
    }
  };

  const getStepperComponent = () => {
    if (currentView === 'dashboard') return null;
    
    const stepMap = {
      'floorplan': 0,
      'panels': 1,
      'mapping': 2,
      'export': 3
    };
    
    const activeStep = stepMap[currentView] || 0;
    
    return (
      <Stepper 
        activeStep={activeStep} 
        sx={{ 
          minWidth: 300,
          '& .MuiStepLabel-root': {
            color: 'inherit',
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8
            }
          },
          '& .MuiStepLabel-label': {
            color: darkMode ? '#ffffff' : '#000000',
            fontWeight: 500,
            cursor: 'pointer',
            '&:hover': {
              textDecoration: 'underline'
            }
          },
          '& .MuiStepIcon-root': {
            color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            fontSize: '1.5rem',
            cursor: 'pointer',
            '&.Mui-active': {
              color: '#000000'
            },
            '&.Mui-completed': {
              color: '#4caf50'
            }
          },
          '& .MuiStepIcon-text': {
            fill: '#ffffff',
            fontSize: '1rem',
            fontWeight: 'bold'
          }
        }}
      >
        <Step completed={activeStep > 0}>
          <StepLabel onClick={() => handleStepClick(0)}>
            Floor Plan
          </StepLabel>
        </Step>
        <Step completed={activeStep > 1}>
          <StepLabel onClick={() => handleStepClick(1)}>
            Panel Setup
          </StepLabel>
        </Step>
        <Step completed={activeStep > 2}>
          <StepLabel onClick={() => handleStepClick(2)}>
            Component Mapping
          </StepLabel>
        </Step>
        <Step active={activeStep === 3}>
          <StepLabel onClick={() => handleStepClick(3)}>
            Panel Export
          </StepLabel>
        </Step>
      </Stepper>
    );
  };

  const showMenuBar = currentView !== 'dashboard' && currentView !== 'settings';

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showMenuBar && (
        <MenuBar 
          darkMode={darkMode} 
          toggleDarkMode={toggleDarkMode} 
          title={getPageTitle()}
          onBackToHome={handleBackToDashboard}
          showBackButton={currentView !== 'dashboard'}
          stepper={getStepperComponent()}
          onSettingsClick={handleSettingsClick}
        />
      )}
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {currentView === 'dashboard' && (
          <ProjectDashboard
            onStartProject={handleStartProject}
            onResumeProject={handleResumeProject}
            onEditProject={handleEditProject}
            darkMode={darkMode}
            onSettingsClick={handleSettingsClick}
          />
        )}

        {currentView === 'settings' && (
          <Settings
            darkMode={darkMode}
            onClose={handleSettingsClose}
          />
        )}
        
        {currentView === 'floorplan' && currentProject && (
          <FloorPlanDrawer
            initialFloorPlan={currentProject}
            onSaveFloorPlan={(savedPlan) => {
              setCurrentProject(savedPlan);
              handleFloorPlanComplete();
            }}
            onProceedToPanels={handleFloorPlanComplete}
            showProceedButton={true}
            darkMode={darkMode}
          />
        )}
        
        {currentView === 'panels' && currentProject && (
          <PanelConfiguration
            project={currentProject}
            onProceedToMapping={handlePanelConfigComplete}
            onBackToFloorPlan={handleBackToFloorPlan}
            darkMode={darkMode}
          />
        )}
        
        {currentView === 'mapping' && currentProject && (
          <ComponentMapping
            project={currentProject}
            onComplete={handleComponentMappingComplete}
            onBackToPanels={handleBackToPanels}
            darkMode={darkMode}
          />
        )}
        
        {currentView === 'export' && currentProject && (
          <PanelExport
            project={currentProject}
            onComplete={handleExportComplete}
            onBackToMapping={handleBackToMapping}
            darkMode={darkMode}
          />
        )}
      </Box>
    </Box>
  );
};

export default ElectricalMapperApp; 