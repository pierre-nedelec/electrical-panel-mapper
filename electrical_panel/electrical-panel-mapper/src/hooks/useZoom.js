// src/hooks/useZoom.js
import { useState } from 'react';

const useZoom = (initialViewBox) => {
  const [viewBox, setViewBox] = useState(initialViewBox);

  const zoomIn = (factor = 0.1) => { // Default zoom factor is 0.1
    const [x, y, width, height] = viewBox.split(' ').map(Number);
    setViewBox(`${x + width * factor} ${y + height * factor} ${width * (1 - factor * 2)} ${height * (1 - factor * 2)}`);
  };

  const zoomOut = (factor = 0.1) => { // Default zoom factor is 0.1
    const [x, y, width, height] = viewBox.split(' ').map(Number);
    setViewBox(`${x - width * factor} ${y - height * factor} ${width * (1 + factor * 2)} ${height * (1 + factor * 2)}`);
  };

  const resetView = () => {
    setViewBox(initialViewBox);
  };

  const isViewModified = viewBox !== initialViewBox;

  return { viewBox, zoomIn, zoomOut, resetView, isViewModified, setViewBox };
};

export default useZoom;
