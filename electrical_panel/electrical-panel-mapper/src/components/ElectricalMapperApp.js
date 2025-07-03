import React, { useState } from 'react';
import { Box, Stepper, Step, StepLabel } from '@mui/material';
import ProjectDashboard from './ProjectDashboard';
import FloorPlanDrawer from './FloorPlanDrawer';
import PanelConfiguration from './PanelConfiguration';
import ComponentMapping from './ComponentMapping';
import MenuBar from './MenuBar';

const ElectricalMapperApp = ({ darkMode, toggleDarkMode }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, floorplan, panels, mapping
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
    } else {
      setCurrentView('mapping');
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
    // Could navigate to a project summary or back to dashboard
    setCurrentView('dashboard');
  };

  const handleBackToFloorPlan = () => {
    setCurrentView('floorplan');
  };

  const handleBackToPanels = () => {
    setCurrentView('panels');
  };

  const handleBackToDashboard = () => {
    setCurrentProject(null);
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
      default:
        return 'Electrical Panel Mapper';
    }
  };

  const handleStepClick = (step) => {
    if (!currentProject) return;
    
    // Only allow navigation to completed or current steps
    const stepMap = {
      'floorplan': 0,
      'panels': 1,
      'mapping': 2
    };
    
    const currentStepIndex = stepMap[currentView] || 0;
    
    if (step <= currentStepIndex) {
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
      }
    }
  };

  const getStepperComponent = () => {
    if (currentView === 'dashboard') return null;
    
    const stepMap = {
      'floorplan': 0,
      'panels': 1,
      'mapping': 2
    };
    
    const activeStep = stepMap[currentView] || 0;
    
    return (
      <Stepper 
        activeStep={activeStep} 
        sx={{ 
          minWidth: 300,
          '& .MuiStepLabel-root': {
            color: 'inherit'
          },
          '& .MuiStepLabel-label': {
            color: darkMode ? '#ffffff' : '#000000',
            fontWeight: 500
          },
          '& .MuiStepIcon-root': {
            color: darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            fontSize: '1.5rem',
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
          <StepLabel 
            onClick={activeStep >= 0 ? () => handleStepClick(0) : undefined}
            sx={{ 
              cursor: activeStep >= 0 ? 'pointer' : 'default',
              opacity: activeStep >= 0 ? 1 : 0.6 
            }}
          >
            Floor Plan
          </StepLabel>
        </Step>
        <Step completed={activeStep > 1}>
          <StepLabel 
            onClick={activeStep >= 1 ? () => handleStepClick(1) : undefined}
            sx={{ 
              cursor: activeStep >= 1 ? 'pointer' : 'default',
              opacity: activeStep >= 1 ? 1 : 0.6 
            }}
          >
            Panel Setup
          </StepLabel>
        </Step>
        <Step active={activeStep === 2}>
          <StepLabel 
            onClick={activeStep >= 2 ? () => handleStepClick(2) : undefined}
            sx={{ 
              cursor: activeStep >= 2 ? 'pointer' : 'default',
              opacity: activeStep >= 2 ? 1 : 0.6 
            }}
          >
            Component Mapping
          </StepLabel>
        </Step>
      </Stepper>
    );
  };

  const showMenuBar = currentView !== 'dashboard';

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
        />
      )}
      
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {currentView === 'dashboard' && (
          <ProjectDashboard
            onStartProject={handleStartProject}
            onResumeProject={handleResumeProject}
            onEditProject={handleEditProject}
            darkMode={darkMode}
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
      </Box>
    </Box>
  );
};

export default ElectricalMapperApp; 