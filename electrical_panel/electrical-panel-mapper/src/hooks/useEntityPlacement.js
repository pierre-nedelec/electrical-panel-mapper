// src/hooks/useEntityPlacement.js
import { useState, useCallback } from 'react';
import config from '../config';

const useEntityPlacement = () => {
  const [entityToAdd, setEntityToAdd] = useState(null);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [placedEntities, setPlacedEntities] = useState([]);

  const handleMouseMove = (event) => {
    if (!entityToAdd) return;

    const svg = event.target.ownerSVGElement;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    setPreviewPosition({
      x: svgPoint.x,
      y: svgPoint.y,
    });
  };

  const handlePlaceEntity = () => {
    if (!entityToAdd || !previewPosition) return;

    const newEntity = {
      type: entityToAdd,
      x: previewPosition.x,
      y: previewPosition.y,
    };

    fetch(`${config.BACKEND_URL}/api/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEntity),
    })
      .then((response) => response.json())
      .then((savedEntity) => {
        setPlacedEntities([...placedEntities, { ...newEntity, id: savedEntity.id }]);
        setEntityToAdd(null);
        setPreviewPosition(null);
      })
      .catch((err) => console.error('Error saving entity:', err));
  };

  const handleFetchEntities = useCallback(() => {
    fetch(`${config.BACKEND_URL}/api/entities`)
      .then((response) => response.json())
      .then((data) => setPlacedEntities(data))
      .catch((err) => console.error('Error fetching entities:', err));
  }, []);

  return {
    entityToAdd,
    setEntityToAdd,
    previewPosition,
    handleMouseMove,
    handlePlaceEntity,
    placedEntities,
    handleFetchEntities,
  };
};

export default useEntityPlacement;
