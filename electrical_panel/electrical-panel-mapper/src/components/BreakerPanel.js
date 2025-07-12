// src/components/BreakerPanel.js
import React, { useState, useEffect } from 'react';
import { Container, Box, Table, TableBody, TableCell, TableHead, TableRow, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, IconButton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import MenuBar from './MenuBar';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import config from '../config';

function BreakerPanel({ toggleDarkMode, darkMode }) {
  const [breakers, setBreakers] = useState([]);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingBreaker, setEditingBreaker] = useState(null);
  const [breakerData, setBreakerData] = useState({ position: '', amps: '' });
  const [isCustomAmps, setIsCustomAmps] = useState(false);

  // Fetch breakers from the backend on mount
  useEffect(() => {
    fetch(`${config.BACKEND_URL}/api/electrical/circuits`)
      .then(response => response.json())
      .then(data => setBreakers(data))
      .catch(err => console.error('Error fetching breakers:', err));
  }, []);

  const handleOpenDialog = (breaker = null) => {
    if (breaker) {
      setBreakerData(breaker);
      setIsCustomAmps(![15, 20, 30].includes(breaker.amps));
      setEditingBreaker(breaker.id);
    } else {
      const nextPosition = breakers.length > 0 ? Math.max(...breakers.map(b => b.position)) + 1 : 1;
      setBreakerData({ position: nextPosition, amps: 15 }); // Default position and amps
      setIsCustomAmps(false);
      setEditingBreaker(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingBreaker(null);
    setBreakerData({ position: '', amps: '' });
  };

  const handleChange = (e) => {
    setBreakerData({ ...breakerData, [e.target.name]: e.target.value });
  };

  const handleAmpsChange = (e, value) => {
    if (value === 'other') {
      setIsCustomAmps(true);
      setBreakerData({ ...breakerData, amps: '' });
    } else {
      setIsCustomAmps(false);
      setBreakerData({ ...breakerData, amps: value });
    }
  };

  const handleSaveBreaker = () => {
    const method = editingBreaker ? 'PUT' : 'POST';
    const url = editingBreaker ? `${config.BACKEND_URL}/api/electrical/circuits/${editingBreaker}` : `${config.BACKEND_URL}/api/electrical/circuits`;

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(breakerData),
    })
      .then(response => response.json())
      .then(data => {
        if (editingBreaker) {
          setBreakers(breakers.map(b => (b.id === editingBreaker ? data : b)));
        } else {
          setBreakers([...breakers, { ...breakerData, id: data.id }]);
        }
        handleCloseDialog();
      })
      .catch(err => console.error('Error saving breaker:', err));
  };

  const handleDeleteBreaker = (id) => {
    fetch(`${config.BACKEND_URL}/api/electrical/circuits/${id}`, {
      method: 'DELETE',
    })
      .then(() => {
        setBreakers(breakers.filter(b => b.id !== id));
      })
      .catch(err => console.error('Error deleting breaker:', err));
  };

  return (
    <Container maxWidth="lg" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MenuBar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        title="Breakers Panel"
        onBackClick={() => window.history.back()}
      />
      <Box mt={4} flexGrow={1}>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Add Breaker
        </Button>
        <Table mt={4}>
          <TableHead>
            <TableRow>
              <TableCell>Position</TableCell>
              <TableCell>Amps</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {breakers.map(breaker => (
              <TableRow key={breaker.id}>
                <TableCell>{breaker.position}</TableCell>
                <TableCell>{breaker.amps}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(breaker)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="secondary" onClick={() => handleDeleteBreaker(breaker.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      {/* Dialog for adding/editing a breaker */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{editingBreaker ? 'Edit Breaker' : 'Add Breaker'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Position"
            name="position"
            value={breakerData.position}
            onChange={handleChange}
            fullWidth
          />
          <ToggleButtonGroup
            value={isCustomAmps ? 'other' : breakerData.amps}
            exclusive
            onChange={handleAmpsChange}
            fullWidth
            sx={{ mt: 2 }}
          >
            <ToggleButton value={15}>15 Amps</ToggleButton>
            <ToggleButton value={20}>20 Amps</ToggleButton>
            <ToggleButton value={30}>30 Amps</ToggleButton>
            <ToggleButton value="other">Other</ToggleButton>
          </ToggleButtonGroup>
          {isCustomAmps && (
            <TextField
              margin="dense"
              label="Custom Amps"
              name="amps"
              value={breakerData.amps}
              onChange={handleChange}
              fullWidth
              type="number"
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSaveBreaker} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default BreakerPanel;
