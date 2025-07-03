// src/components/EntityPreview.js
import React from 'react';

const EntityPreview = ({ entityToAdd, previewPosition }) => {
  if (!entityToAdd || !previewPosition) return null;

  return (
    <circle
      cx={previewPosition.x}
      cy={previewPosition.y}
      r="4"
      fill={entityToAdd === 'light' ? 'rgba(255,255,0,0.5)' : 'rgba(0,0,255,0.5)'}
    />
  );
};

export default EntityPreview;
