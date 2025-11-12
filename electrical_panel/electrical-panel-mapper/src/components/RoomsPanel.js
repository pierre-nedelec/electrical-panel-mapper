// src/components/RoomsPanel.js
import React, { useState, useRef, useEffect } from 'react';
import { Container, Box } from '@mui/material';
import MenuBar from './MenuBar';
import { ReactComponent as HouseMap } from '../assets/house-map.svg';
import useZoom from '../hooks/useZoom';
import usePanZoom from '../hooks/usePanZoom';
import useSvgTheming from '../hooks/useSvgTheming';
import RoomLabelDialog from './RoomLabelDialog';
import config from '../config';

const initialViewBox = '0 0 500 400';

function RoomsPanel({ toggleDarkMode, darkMode }) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const { viewBox, setViewBox } = useZoom(initialViewBox);
  const svgRef = useRef(null);

  usePanZoom(svgRef, viewBox, setViewBox);
  useSvgTheming(svgRef, viewBox, darkMode);

  useEffect(() => {
    // Fetch rooms data
    fetch(`${config.BACKEND_URL}/api/rooms`)
      .then(response => response.json())
      .then(data => setRooms(data))
      .catch(err => console.error('Error fetching rooms:', err));
  }, []);

  const handleRoomClick = (event) => {
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursorPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    const clickedRoom = rooms.find(room => {
      const roomElement = svg.getElementById(room.svg_ref);
      if (roomElement) {
        const bbox = roomElement.getBBox();
        return (
          cursorPoint.x >= bbox.x &&
          cursorPoint.x <= bbox.x + bbox.width &&
          cursorPoint.y >= bbox.y &&
          cursorPoint.y <= bbox.y + bbox.height
        );
      }
      return false;
    });

    if (clickedRoom) {
      setSelectedRoom(clickedRoom);
      setDialogOpen(true);
    }
  };

  const handleSaveRoomLabel = (roomName) => {
    if (selectedRoom) {
      // Update room name on the backend
      fetch(`${config.BACKEND_URL}/api/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roomName }),
      })
        .then(response => response.json())
        .then(updatedRoom => {
          setRooms(rooms.map(room => (room.id === updatedRoom.id ? updatedRoom : room)));
        })
        .catch(err => console.error('Error updating room:', err));
    }

    setDialogOpen(false);
    setSelectedRoom(null);
  };
  useEffect(() => {
    if (svgRef.current) {
      const svgRoot = svgRef.current;
      svgRoot.style.fill = darkMode ? '#333333' : '#ffffff';
      svgRoot.style.stroke = darkMode ? '#ffffff' : '#000000';
    }
  }, [darkMode]);
  return (
    <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MenuBar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        title="Label Rooms"
        // onBackClick={() => navigate('/')}
      />
      <Box
        mt={2}
        flexGrow={1}
        display="flex"
        justifyContent="center"
        position="relative"
        overflow="hidden"
        onClick={handleRoomClick}
      >
        <Box
          component="svg"
          ref={svgRef}
          viewBox={viewBox}
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
        </Box>
      </Box>
      <RoomLabelDialog
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveRoomLabel}
        initialLabel={selectedRoom?.name || ''}
      />
    </Container>
  );
}

export default RoomsPanel;
