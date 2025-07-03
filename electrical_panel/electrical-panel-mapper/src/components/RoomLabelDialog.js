// src/components/RoomLabelDialog.js
import React, { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';

function RoomLabelDialog({ open, onClose, onSave, initialLabel }) {
  const [label, setLabel] = useState(initialLabel);

  const handleSave = () => {
    onSave(label);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Label Room</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Room Name"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RoomLabelDialog;
