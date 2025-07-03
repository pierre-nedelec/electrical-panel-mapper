// src/components/EntityDetailsDialog.js
import React, { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const EntityDetailsDialog = ({ open, onClose, onSave, rooms }) => {
  const [entityName, setEntityName] = useState('');
  const [breakerId, setBreakerId] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSave = () => {
    onSave({
      name: entityName,
      breaker_id: breakerId,
      room_id: roomId,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Entity Details</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Entity Name"
          fullWidth
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Breaker ID"
          fullWidth
          value={breakerId}
          onChange={(e) => setBreakerId(e.target.value)}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Room</InputLabel>
          <Select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            {rooms.map(room => (
              <MenuItem key={room.id} value={room.id}>
                {room.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Cancel</Button>
        <Button onClick={handleSave} color="primary">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EntityDetailsDialog;
