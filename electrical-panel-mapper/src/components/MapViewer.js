// src/components/MapViewer.js
import React, { useEffect, useCallback, forwardRef } from 'react';
import { Box } from '@mui/material';
import { ReactComponent as HouseMap } from '../assets/house-map.svg';
import usePanZoom from '../hooks/usePanZoom';
import ZoomButtonGroup from './ZoomButtonGroup';

const MapViewer = forwardRef(({ viewBox, setViewBox, darkMode, onMouseMove, onClick, children }, ref) => {
  usePanZoom(ref, viewBox, setViewBox, null); // Pass null for entityToAdd since MapViewer doesn't use it

  useEffect(() => {
    if (ref.current) {
      const svgRoot = ref.current;
      svgRoot.style.fill = darkMode ? '#333333' : '#ffffff';
      svgRoot.style.stroke = darkMode ? '#ffffff' : '#000000';
    }
  }, [darkMode, ref]);

  const handleWheel = useCallback(
    (event) => {
      event.preventDefault();
      const zoomFactor = 0.01;
      if (event.deltaY < 0) setViewBox((prev) => zoomIn(prev, zoomFactor));
      else setViewBox((prev) => zoomOut(prev, zoomFactor));
    },
    [setViewBox]
  );

  const handleKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        case '+':
          setViewBox((prev) => zoomIn(prev, 0.1));
          break;
        case '-':
          setViewBox((prev) => zoomOut(prev, 0.1));
          break;
        case '0':
          setViewBox('0 0 500 400');
          break;
        default:
          break;
      }
    },
    [setViewBox]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const svgElement = ref.current;
    if (svgElement) {
      svgElement.addEventListener('wheel', handleWheel);
      return () => {
        svgElement.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleWheel, ref]);

  return (
    <Box
      position="relative"
      overflow="hidden"
      flexGrow={1}
      display="flex"
      justifyContent="center"
    >
      <Box
        component="svg"
        ref={ref}
        viewBox={viewBox}
        onMouseMove={onMouseMove}
        onClick={onClick}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <HouseMap />
        {children}
      </Box>
      <ZoomButtonGroup
        onZoomIn={() => setViewBox((prev) => zoomIn(prev, 0.1))}
        onZoomOut={() => setViewBox((prev) => zoomOut(prev, 0.1))}
        onResetView={() => setViewBox('0 0 500 400')}
        isViewModified={viewBox !== '0 0 500 400'}
      />
    </Box>
  );
});

const zoomIn = (viewBox, factor) => {
  const [x, y, width, height] = viewBox.split(' ').map(Number);
  return `${x + width * factor} ${y + height * factor} ${width * (1 - 2 * factor)} ${height * (1 - 2 * factor)}`;
};

const zoomOut = (viewBox, factor) => {
  const [x, y, width, height] = viewBox.split(' ').map(Number);
  return `${x - width * factor} ${y - height * factor} ${width * (1 + 2 * factor)} ${height * (1 + 2 * factor)}`;
};

export default MapViewer;
