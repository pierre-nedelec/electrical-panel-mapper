// src/components/ZoomControls.js
import React from 'react';
import { IconButton } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

function ZoomControls({ onZoomIn, onZoomOut }) {
  return (
    <>
      <IconButton color="inherit" onClick={onZoomIn}>
        <ZoomInIcon />
      </IconButton>
      <IconButton color="inherit" onClick={onZoomOut}>
        <ZoomOutIcon />
      </IconButton>
    </>
  );
}

export default ZoomControls;
