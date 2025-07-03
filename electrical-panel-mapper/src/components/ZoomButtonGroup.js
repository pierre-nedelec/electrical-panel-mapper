// src/components/ZoomButtonGroup.js
import React from 'react';
import { IconButton, Box } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import HomeIcon from '@mui/icons-material/Home';

const ZoomButtonGroup = ({ onZoomIn, onZoomOut, onResetView, isViewModified }) => {
  return (
    <Box
      position="fixed"
      top="72px"
      right="16px"
      display="flex"
      flexDirection="column"
      zIndex={1000} // Ensure it stays above other elements
    >
      <IconButton
        onClick={onZoomIn}
        style={{
          marginBottom: '8px',
          backgroundColor: 'rgba(255, 87, 34, 0.6)', // Bright orange
          color: '#fff', // White icon color
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)', // Add some shadow for depth
        }}
      >
        <ZoomInIcon />
      </IconButton>
      <IconButton
        onClick={onZoomOut}
        style={{
          marginBottom: '8px',
          backgroundColor: 'rgba(0, 150, 136, 0.6)', // Teal color
          color: '#fff', // White icon color
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)', // Add some shadow for depth
        }}
      >
        <ZoomOutIcon />
      </IconButton>
      {isViewModified && (  // Only show the Reset View button if the view has been modified
        <IconButton
          onClick={onResetView}
          style={{
            backgroundColor: 'rgba(63, 81, 181, 0.2)', // Indigo color for reset button
            color: '#fff', // White icon color
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)', // Add some shadow for depth
          }}
        >
          <HomeIcon />
        </IconButton>
      )}
    </Box>
  );
};

export default ZoomButtonGroup;
