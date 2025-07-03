// src/components/MenuBar.js
import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Button, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MenuBar = ({ 
  darkMode, 
  toggleDarkMode, 
  title, 
  children, 
  onBackToHome,
  showBackButton = false,
  stepper = null 
}) => {
  return (
    <AppBar position="static">
      <Toolbar>
        {showBackButton && (
          <IconButton 
            edge="start" 
            color="inherit" 
            aria-label="back to home"
            onClick={onBackToHome}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        
        {/* Stepper in header */}
        {stepper && (
          <Box sx={{ mr: 2 }}>
            {stepper}
          </Box>
        )}
        
        {children}
        <IconButton color="inherit" onClick={toggleDarkMode}>
          {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default MenuBar;
