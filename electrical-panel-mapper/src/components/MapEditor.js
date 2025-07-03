// src/components/MapEditor.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, IconButton, SpeedDial, SpeedDialAction } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UndoIcon from '@mui/icons-material/Undo';
import SaveIcon from '@mui/icons-material/Save';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OutletIcon from '@mui/icons-material/Power';
import MenuBar from './MenuBar';
import ZoomButtonGroup from './ZoomButtonGroup';
import MapViewer from './MapViewer';
import RoomLabelDialog from './RoomLabelDialog';
import useZoom from '../hooks/useZoom';
import useRoomLabels from '../hooks/useRoomLabels';
import config from '../config';

const initialViewBox = '0 0 500 400';

function MapEditor({ toggleDarkMode, darkMode }) {
  const [entityToAdd, setEntityToAdd] = useState(null);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [placedEntities, setPlacedEntities] = useState([]);
  const [openLabelDialog, setOpenLabelDialog] = useState(false);
  const [selectedRectId, setSelectedRectId] = useState(null);
  const { viewBox, setViewBox, zoomIn, zoomOut, resetView, isViewModified } = useZoom(initialViewBox);
  const svgRef = useRef(null);
  const navigate = useNavigate();
  const { getRoomName, saveRoomLabel } = useRoomLabels(svgRef);

  useEffect(() => {
    fetch(`${config.BACKEND_URL}/entities`)
      .then((response) => response.json())
      .then((data) => setPlacedEntities(data))
      .catch((err) => console.error('Error fetching entities:', err));
  }, []);

  const handleMouseMove = (event) => {
    if (!entityToAdd) return;

    const svg = svgRef.current;
    if (!svg) return;

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
      name: `Entity ${placedEntities.length + 1}`,
      breaker: `Breaker ${Math.floor(Math.random() * 10) + 1}`,
    };

    fetch(`${config.BACKEND_URL}/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEntity),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then((savedEntity) => {
        setPlacedEntities([...placedEntities, { ...newEntity, id: savedEntity.id }]);
        setEntityToAdd(null);
        setPreviewPosition(null);
      })
      .catch((err) => console.error('Error saving entity:', err));
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    const target = event.target;

    if (target.tagName === 'rect') {
      const rectId = target.id;
      setSelectedRectId(rectId);
      setOpenLabelDialog(true);
    }
  };

  const handleLabelSave = (roomName) => {
    if (selectedRectId) {
      saveRoomLabel(selectedRectId, roomName);
      setOpenLabelDialog(false);
      setSelectedRectId(null);
    }
  };

  const handleKeyDown = useCallback(
    (event) => {
      switch (event.key) {
        case 'l':
          setEntityToAdd('light');
          break;
        case 'o':
          setEntityToAdd('outlet');
          break;
        case 'Escape':
          setEntityToAdd(null);
          setPreviewPosition(null);
          break;
        case '+':
          zoomIn(0.1);
          break;
        case '-':
          zoomOut(0.1);
          break;
        case '0':
          resetView();
          break;
        default:
          break;
      }
    },
    [setEntityToAdd, zoomIn, zoomOut, resetView]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MenuBar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        title="Map Editor"
        onBackClick={() => navigate('/')}
      >
        <IconButton color="inherit" onClick={() => console.log('Undo')}>
          <UndoIcon />
        </IconButton>
        <IconButton color="inherit" onClick={() => console.log('Save')}>
          <SaveIcon />
        </IconButton>
      </MenuBar>
      <Box
        mt={2}
        flexGrow={1}
        display="flex"
        justifyContent="center"
        position="relative"
        overflow="hidden"
        onMouseMove={handleMouseMove}
        onClick={handlePlaceEntity}
        onContextMenu={handleContextMenu}
      >
        <MapViewer
          ref={svgRef}
          viewBox={viewBox}
          setViewBox={setViewBox}
          darkMode={darkMode}
        >
          {placedEntities.map((entity, index) => (
            <circle
              key={index}
              cx={entity.x}
              cy={entity.y}
              r="4"
              fill={entity.type === 'light' ? 'yellow' : 'blue'}
            />
          ))}
          {entityToAdd && previewPosition && (
            <circle
              cx={previewPosition.x}
              cy={previewPosition.y}
              r="4"
              fill={entityToAdd === 'light' ? 'rgba(255,255,0,0.5)' : 'rgba(0,0,255,0.5)'}
            />
          )}
        </MapViewer>
        <ZoomButtonGroup
          onZoomIn={() => zoomIn(0.1)}
          onZoomOut={() => zoomOut(0.1)}
          onResetView={resetView}
          isViewModified={isViewModified}
        />
        <SpeedDial
          ariaLabel="Add Entity"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<AddIcon />}
          direction="up"
        >
          <SpeedDialAction
            icon={<LightbulbIcon />}
            tooltipTitle="Add Light"
            onClick={() => setEntityToAdd('light')}
          />
          <SpeedDialAction
            icon={<OutletIcon />}
            tooltipTitle="Add Outlet"
            onClick={() => setEntityToAdd('outlet')}
          />
        </SpeedDial>
      </Box>
      <RoomLabelDialog
        open={openLabelDialog}
        onClose={() => setOpenLabelDialog(false)}
        onSave={handleLabelSave}
        initialLabel={selectedRectId ? getRoomName(selectedRectId) : ''}
      />
    </Container>
  );
}

export default MapEditor;
