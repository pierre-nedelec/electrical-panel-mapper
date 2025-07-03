// src/components/EntityPlacement.js
import React from 'react';

const EntityPlacement = ({ entities }) => {
  return (
    <>
      {entities.map((entity) => (
        <circle
          key={entity.id}
          cx={entity.x}
          cy={entity.y}
          r="4"
          fill={entity.type === 'light' ? 'yellow' : 'blue'}
        />
      ))}
    </>
  );
};

export default EntityPlacement;
