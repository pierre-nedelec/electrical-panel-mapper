// src/hooks/useRoomLabeling.js
import { useState } from 'react';
import config from '../config';

const useRoomLabeling = () => {
  const [openLabelDialog, setOpenLabelDialog] = useState(false);
  const [selectedRectId, setSelectedRectId] = useState(null);

  const handleContextMenu = (event) => {
    event.preventDefault();
    const target = event.target;

    if (target.tagName === 'rect') {
      setSelectedRectId(target.id);
      setOpenLabelDialog(true);
    }
  };

  const handleLabelSave = (roomName) => {
    if (selectedRectId) {
      fetch(`${config.BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roomName, svg_ref: selectedRectId }),
      })
        .then(() => {
          setOpenLabelDialog(false);
          setSelectedRectId(null);
        })
        .catch((err) => console.error('Error saving room label:', err));
    }
  };

  return {
    handleContextMenu,
    openLabelDialog,
    setOpenLabelDialog,
    handleLabelSave,
  };
};

export default useRoomLabeling;
