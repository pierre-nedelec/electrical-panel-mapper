// src/components/MapContainer.js
import React, { useRef, useEffect, useState } from 'react';
import ZoomControls from './ZoomControls';
import { AppBar, Toolbar, Box } from '@mui/material';

function MapContainer({ children, svgPath }) {
  const [viewBox, setViewBox] = useState('0 0 123.85403 106.27711'); // Adjust based on your SVG
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current.contentDocument;
    if (svg) {
      svg.documentElement.setAttribute('viewBox', viewBox);
    }
  }, [viewBox]);

  const zoomIn = () => {
    const [x, y, width, height] = viewBox.split(' ').map(Number);
    setViewBox(`${x + width * 0.1} ${y + height * 0.1} ${width * 0.8} ${height * 0.8}`);
  };

  const zoomOut = () => {
    const [x, y, width, height] = viewBox.split(' ').map(Number);
    setViewBox(`${x - width * 0.1} ${y - height * 0.1} ${width * 1.25} ${height * 1.25}`);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          {children} {/* Place for additional buttons */}
          <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />
        </Toolbar>
      </AppBar>
      <Box mt={2} display="flex" justifyContent="center">
        <object ref={svgRef} type="image/svg+xml" data={svgPath} className="house-map-svg">
          Your browser does not support SVG
        </object>
      </Box>
    </Box>
  );
}

export default MapContainer;
