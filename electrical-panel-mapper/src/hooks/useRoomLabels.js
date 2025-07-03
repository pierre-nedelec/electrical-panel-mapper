// src/hooks/useRoomLabels.js
import { useState, useEffect, useCallback } from 'react';
import config from '../config';

const useRoomLabels = (svgRef) => {
  const [roomLabels, setRoomLabels] = useState({});

  const updateSvgLabel = useCallback((rectId, roomName) => {
    const svgElement = svgRef.current;
    if (svgElement) {
      const existingLabel = svgElement.querySelector(`text[data-rect-id="${rectId}"]`);
      const rect = svgElement.getElementById(rectId).getBBox();
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;

      if (existingLabel) {
        existingLabel.textContent = roomName;
        existingLabel.setAttribute('x', centerX);
        existingLabel.setAttribute('y', centerY);
      } else {
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', centerX);
        textElement.setAttribute('y', centerY);
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');
        textElement.textContent = roomName;
        textElement.setAttribute('data-rect-id', rectId);
        svgElement.appendChild(textElement);
      }
    }
  }, [svgRef]);

  useEffect(() => {
    // Fetch initial room labels from the backend and populate the state
    fetch(`${config.BACKEND_URL}/rooms`)
      .then((response) => response.json())
      .then((data) => {
        const labels = {};
        data.forEach((room) => {
          labels[room.svg_ref] = room.name;
        });
        setRoomLabels(labels);

        // Once the labels are fetched, update the SVG
        Object.entries(labels).forEach(([rectId, roomName]) => {
          updateSvgLabel(rectId, roomName);
        });
      })
      .catch((err) => console.error('Error fetching rooms:', err));
  }, [updateSvgLabel]);

  const getRoomName = (rectId) => {
    return roomLabels[rectId] || '';
  };

  const saveRoomLabel = (rectId, roomName) => {
    fetch(`${config.BACKEND_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: roomName, svg_ref: rectId }),
    })
      .then((response) => response.json())
      .then((data) => {
        setRoomLabels((prevLabels) => ({
          ...prevLabels,
          [rectId]: roomName,
        }));
        updateSvgLabel(rectId, roomName);
      })
      .catch((err) => console.error('Error saving room label:', err));
  };

  return { getRoomName, saveRoomLabel };
};

export default useRoomLabels;
