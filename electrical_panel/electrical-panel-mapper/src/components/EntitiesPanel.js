// src/components/EntitiesPanel.js
import React, { useState, useEffect } from 'react';
import { Container, Box, Table, TableBody, TableCell, TableHead, TableRow, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, IconButton, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import MenuBar from './MenuBar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import config from '../config';

function EntitiesPanel({ toggleDarkMode, darkMode }) {
  const [entities, setEntities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityData, setEntityData] = useState({ type: '', room_id: '', breaker_id: '' });

  // Fetch entities and rooms from the backend on mount
  useEffect(() => {
    fetch(`${config.BACKEND_URL}/api/entities`)
      .then(response => response.json())
      .then(data => setEntities(data))
      .catch(err => console.error('Error fetching entities:', err));

    fetch(`${config.BACKEND_URL}/api/rooms`)
      .then(response => response.json())
      .then(data => setRooms(data))
      .catch(err => console.error('Error fetching rooms:', err));
  }, []);

  const handleOpenDialog = (entity = null) => {
    if (entity) {
      setEntityData(entity);
      setEditingEntity(entity.id);
    } else {
      setEntityData({ type: '', room_id: '', breaker_id: '' });
      setEditingEntity(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEntity(null);
    setEntityData({ type: '', room_id: '', breaker_id: '' });
  };

  const handleChange = (e) => {
    setEntityData({ ...entityData, [e.target.name]: e.target.value });
  };

  const handleSaveEntity = () => {
    const method = 'PUT';
    const url = `${config.BACKEND_URL}/api/entities/${editingEntity}`;

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entityData),
    })
      .then(response => response.json())
      .then(data => {
        setEntities(entities.map(e => (e.id === editingEntity ? data : e)));
        handleCloseDialog();
      })
      .catch(err => console.error('Error saving entity:', err));
  };

  const handleDeleteEntity = (id) => {
    fetch(`${config.BACKEND_URL}/api/entities/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setEntities(entities.filter(e => e.id !== id));
      })
      .catch(err => console.error('Error deleting entity:', err));
  };

  return (
    <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MenuBar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        title="Entities Panel"
        onBackClick={() => window.history.back()}
      />
      <Box mt={4} flexGrow={1}>
        <Table size="small" mt={4}>
          <TableHead>
            <TableRow>
              <TableCell>Label</TableCell>
              <TableCell>Room Name</TableCell>
              <TableCell>Position (X, Y)</TableCell>
              <TableCell>Voltage</TableCell>
              <TableCell>Amperage</TableCell>
              <TableCell>Wattage</TableCell>
              <TableCell>GFCI</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entities.map(entity => (
              <TableRow key={entity.id}>
                <TableCell>{entity.label || 'Unlabeled'}</TableCell>
                <TableCell>{entity.room_name || 'Unassigned'}</TableCell>
                <TableCell>{`(${entity.x.toFixed(2)}, ${entity.y.toFixed(2)})`}</TableCell>
                <TableCell>{entity.voltage || 120}V</TableCell>
                <TableCell>{entity.amperage || 15}A</TableCell>
                <TableCell>{entity.wattage || 0}W</TableCell>
                <TableCell>{entity.gfci ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(entity)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="secondary" onClick={() => handleDeleteEntity(entity.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Dialog for editing an entity */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Edit Entity</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Label"
            name="label"
            value={entityData.label || ''}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Room</InputLabel>
            <Select
              name="room_id"
              value={entityData.room_id || ''}
              onChange={handleChange}
            >
              <MenuItem value="">No Room</MenuItem>
              {rooms.map(room => (
                <MenuItem key={room.id} value={room.id}>
                  {room.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Voltage (V)"
            name="voltage"
            type="number"
            value={entityData.voltage || 120}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            margin="dense"
            label="Amperage (A)"
            name="amperage"
            type="number"
            value={entityData.amperage || 15}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            margin="dense"
            label="Wattage (W)"
            name="wattage"
            type="number"
            value={entityData.wattage || 0}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>GFCI Protection</InputLabel>
            <Select
              name="gfci"
              value={entityData.gfci ? 'true' : 'false'}
              onChange={(e) => handleChange({ target: { name: 'gfci', value: e.target.value === 'true' } })}
            >
              <MenuItem value="false">No</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveEntity} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default EntitiesPanel;
