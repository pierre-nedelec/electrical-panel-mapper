// src/components/FloorPlanDrawer.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Fab, Typography, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert, Chip, Tabs, Tab, MenuItem, FormControlLabel, Checkbox } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import SaveIcon from '@mui/icons-material/Save';

import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';
import HelpIcon from '@mui/icons-material/Help';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import CheckIcon from '@mui/icons-material/Check';
import {
  loadFloorPlansFromServer,
  deleteFloorPlanFromServer,
  saveFloorPlanLocal,
  loadFloorPlansLocal,
  deleteFloorPlanLocal
} from '../utils/floorPlanUtils';

// Electrical components
import ElectricalSymbolPalette from './electrical/ElectricalSymbolPalette';
import ElectricalComponentLayer from './electrical/ElectricalComponentLayer';
import PanelVisualization from './electrical/PanelVisualization';
// Circuit visualization removed for UI simplicity
// CircuitManager removed for UI simplicity
import { useComponentPlacement, ComponentPreview } from './electrical/ComponentPlacement';
import config from '../config';
import deviceTypesService from '../services/deviceTypesService';
import { getDeviceTypeId } from '../utils/deviceTypeMapping';

const FloorPlanDrawer = ({
  onSaveFloorPlan,
  initialFloorPlan = null,
  onProceedToPanels = null,
  showProceedButton = false,
  electricalModeOnly = false,
  showPanelConfig = true,
  onBackToPanels = null,
  showBackButton = false,
  darkMode = false
}) => {
  // State management
  const [rooms, setRooms] = useState(initialFloorPlan?.rooms || []);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [mode, setMode] = useState('draw');
  const [currentRect, setCurrentRect] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(initialFloorPlan || { id: null, name: 'Untitled Floor Plan', rooms: [] });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
      const [saveDialog, setSaveDialog] = useState(false);
  const [loadDialog, setLoadDialog] = useState(false);

  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapIndicators, setSnapIndicators] = useState([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Drawing and interaction states
  const [startPoint, setStartPoint] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const [floorPlanName, setFloorPlanName] = useState(initialFloorPlan?.name || '');
  const [deleteRoomDialog, setDeleteRoomDialog] = useState({ open: false, room: null });

  // Scale and dimension states
  const [scaleSettings, setScaleSettings] = useState(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('floorPlanScaleSettings');
    return saved ? JSON.parse(saved) : {
      pixelsPerUnit: 20,
      unit: 'ft',
      showDimensions: true
    };
  });
  const [showScaleDialog, setShowScaleDialog] = useState(false);
  const [editingDimension, setEditingDimension] = useState(null);
  const [dimensionInput, setDimensionInput] = useState('');
  const [constraintPreview, setConstraintPreview] = useState(null);

  // Save scale settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('floorPlanScaleSettings', JSON.stringify(scaleSettings));
  }, [scaleSettings]);

  // History and undo/redo
  const [actionHistory, setActionHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragStartRoomState, setDragStartRoomState] = useState(null);

  // Pan and zoom state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [viewBox, setViewBox] = useState(initialFloorPlan?.view_box || initialFloorPlan?.viewBox || "0 0 800 600");

  // Electrical system state
  const [currentMode, setCurrentMode] = useState(electricalModeOnly ? 'electrical' : 'rooms');
  const [electricalComponents, setElectricalComponents] = useState([]);
  const [selectedElectricalTool, setSelectedElectricalTool] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showElectricalLayer, setShowElectricalLayer] = useState(true);

  // Panel state
  const [electricalPanels, setElectricalPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingElectrical, setIsLoadingElectrical] = useState(false);

  const svgRef = useRef(null);
  const spaceKeyPressed = useRef(false);

  // Initialize component placement hook
  const {
    previewComponent,
    handleMouseMove: handleComponentMouseMove,
    handlePlacement: handleComponentPlacement,
    clearPreview
  } = useComponentPlacement(svgRef, snapToGrid, scaleSettings.pixelsPerUnit, rooms);

  // Auto-save check on mount (simplified for single project approach)
  useEffect(() => {
    const autoSaveData = localStorage.getItem('floorPlanAutoSave');
    if (autoSaveData && !initialFloorPlan) {
      try {
        const parsed = JSON.parse(autoSaveData);
        const saveTime = new Date(parsed.timestamp);
        const timeDiff = (new Date() - saveTime) / (1000 * 60); // minutes

        if (timeDiff < 60 && parsed.rooms.length > 0) { // Within last hour
          showNotification(
            `Found auto-saved work from ${Math.round(timeDiff)} minutes ago.`,
            'info'
          );
        }
      } catch (error) {
        console.warn('Failed to parse auto-save data:', error);
      }
    }
  }, [initialFloorPlan]);

  // Track unsaved changes
  useEffect(() => {
    if (initialFloorPlan?.rooms) {
      const hasChanges = JSON.stringify(rooms) !== JSON.stringify(initialFloorPlan.rooms);
      setHasUnsavedChanges(hasChanges);
    } else {
      setHasUnsavedChanges(rooms.length > 0);
    }
  }, [rooms, initialFloorPlan]);

  // Initialize history with initial rooms state
  useEffect(() => {
    if (actionHistory.length === 0 && rooms.length >= 0) {
      const initialAction = {
        rooms: JSON.parse(JSON.stringify(rooms)),
        description: 'Initial state',
        timestamp: Date.now()
      };
      setActionHistory([initialAction]);
      setHistoryIndex(0);
    }
  }, [rooms, actionHistory.length]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    if (rooms.length === 0) return;

    const autoSaveInterval = setInterval(() => {
      const autoSaveData = {
        rooms,
        timestamp: new Date().toISOString(),
        name: initialFloorPlan?.name || 'Unsaved Floor Plan'
      };
      localStorage.setItem('floorPlanAutoSave', JSON.stringify(autoSaveData));
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [rooms, initialFloorPlan]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts when not typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

      switch (event.key) {
        case ' ':
          // Space bar activates pan mode
          spaceKeyPressed.current = true;
          event.preventDefault();
          break;
        case 'Shift':
          // Shift temporarily disables snap
          setIsShiftPressed(true);
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedComponent && currentMode === 'electrical') {
            handleDeleteElectricalComponent(selectedComponent);
            event.preventDefault();
          } else if (selectedRoom && currentMode === 'rooms') {
            handleDeleteRoom();
            event.preventDefault();
          }
          break;
        case 'd':
          if (event.ctrlKey || event.metaKey) {
            if (selectedRoom) {
              handleDuplicateRoom();
              event.preventDefault();
            }
          }
          break;
        case 'Escape':
          if (selectedElectricalTool) {
            setSelectedElectricalTool(null);
            clearPreview();
          } else if (selectedComponent) {
            setSelectedComponent(null);
          } else if (selectedRoom) {
            setSelectedRoom(null);
          }
          if (mode === 'draw') {
            setMode('select');
          }
          event.preventDefault();
          break;
        case 'ArrowUp':
          if (selectedRoom && (event.ctrlKey || event.metaKey)) {
            moveRoom(0, -10, event.shiftKey);
            event.preventDefault();
          }
          break;
        case 'ArrowDown':
          if (selectedRoom && (event.ctrlKey || event.metaKey)) {
            moveRoom(0, 10, event.shiftKey);
            event.preventDefault();
          }
          break;
        case 'ArrowLeft':
          if (selectedRoom && (event.ctrlKey || event.metaKey)) {
            moveRoom(-10, 0, event.shiftKey);
            event.preventDefault();
          }
          break;
        case 'ArrowRight':
          if (selectedRoom && (event.ctrlKey || event.metaKey)) {
            moveRoom(10, 0, event.shiftKey);
            event.preventDefault();
          }
          break;
        case 's':
          if (event.ctrlKey || event.metaKey) {
            // Ctrl+S for Save
            handleSave();
            event.preventDefault();
          }
          break;

        case 'z':
          if (event.ctrlKey || event.metaKey) {
            if (event.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            event.preventDefault();
          }
          break;
        case 'Z': // Handle uppercase Z for Shift+Cmd+Z on Mac
          if (event.ctrlKey || event.metaKey) {
            handleRedo();
            event.preventDefault();
          }
          break;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === ' ') {
        spaceKeyPressed.current = false;
      } else if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedRoom]);

  // Helper functions
  const moveRoom = (deltaX, deltaY, forceDisableSnap = false) => {
    if (!selectedRoom) return;

    const newRooms = rooms.map(room =>
      room.id === selectedRoom.id
        ? {
            ...room,
            x: snapToGridIfEnabled(room.x + deltaX, forceDisableSnap),
            y: snapToGridIfEnabled(room.y + deltaY, forceDisableSnap)
          }
        : room
    );
    setRooms(newRooms);
    saveToHistory(newRooms, `Moved room "${selectedRoom.name}"`);
  };

  const handleDuplicateRoom = () => {
    if (!selectedRoom) return;

    const newRoom = {
      ...selectedRoom,
      id: `room-${Date.now()}`,
      name: `${selectedRoom.name} Copy`,
      x: selectedRoom.x + 20,
      y: selectedRoom.y + 20
    };

    const newRooms = [...rooms, newRoom];
    setRooms(newRooms);
    saveToHistory(newRooms, `Duplicated room "${selectedRoom.name}"`);
    setSelectedRoom(newRoom);
    showNotification('Room duplicated! Use Ctrl+D to duplicate again.', 'success');
  };

  const snapToGridIfEnabled = (value, forceDisable = false) => {
    if (!snapToGrid || forceDisable || isShiftPressed) return value;
    return Math.round(value / scaleSettings.pixelsPerUnit) * scaleSettings.pixelsPerUnit;
  };

  // Unit conversion utilities
  const pixelsToUnits = (pixels) => {
    return (pixels / scaleSettings.pixelsPerUnit).toFixed(2);
  };

  const unitsToPixels = (units) => {
    return parseFloat(units) * scaleSettings.pixelsPerUnit;
  };

  const formatDimension = (pixels) => {
    const value = pixelsToUnits(pixels);
    return `${value}${scaleSettings.unit}`;
  };

  const parseDimensionInput = (input) => {
    // Parse inputs like "12ft", "3.5m", "24in", "150cm", or just "12"
    const match = input.match(/^(\d+\.?\d*)\s*(ft|in|m|cm)?$/i);
    if (!match) return null;

    const value = parseFloat(match[1]);
    const inputUnit = match[2]?.toLowerCase() || scaleSettings.unit;

    // Convert to current units if needed
    let convertedValue = value;
    if (inputUnit !== scaleSettings.unit) {
      // Simple unit conversion
      const conversions = {
        'ft': { 'in': 12, 'm': 0.3048, 'cm': 30.48 },
        'in': { 'ft': 1/12, 'm': 0.0254, 'cm': 2.54 },
        'm': { 'ft': 3.28084, 'in': 39.3701, 'cm': 100 },
        'cm': { 'ft': 0.0328084, 'in': 0.393701, 'm': 0.01 }
      };
      convertedValue = value * (conversions[inputUnit]?.[scaleSettings.unit] || 1);
    }

    return convertedValue;
  };

  // Constraint detection - find rooms that share walls
  const findAdjacentRooms = (targetRoom, edge) => {
    const tolerance = 5; // pixels
    const adjacent = [];

    for (const room of rooms) {
      if (room.id === targetRoom.id) continue;

      let isAdjacent = false;
      let relationship = null;

      if (edge === 'width') {
        // Check left and right edges
        const targetLeft = targetRoom.x;
        const targetRight = targetRoom.x + targetRoom.width;
        const roomLeft = room.x;
        const roomRight = room.x + room.width;

        // Check if rooms share a vertical edge and overlap vertically
        const verticalOverlap = !(targetRoom.y + targetRoom.height <= room.y || targetRoom.y >= room.y + room.height);

        if (verticalOverlap) {
          if (Math.abs(targetRight - roomLeft) < tolerance) {
            isAdjacent = true;
            relationship = 'right-to-left'; // target's right edge touches room's left edge
          } else if (Math.abs(targetLeft - roomRight) < tolerance) {
            isAdjacent = true;
            relationship = 'left-to-right'; // target's left edge touches room's right edge
          }
        }
      } else if (edge === 'height') {
        // Check top and bottom edges
        const targetTop = targetRoom.y;
        const targetBottom = targetRoom.y + targetRoom.height;
        const roomTop = room.y;
        const roomBottom = room.y + room.height;

        // Check if rooms share a horizontal edge and overlap horizontally
        const horizontalOverlap = !(targetRoom.x + targetRoom.width <= room.x || targetRoom.x >= room.x + room.width);

        if (horizontalOverlap) {
          if (Math.abs(targetBottom - roomTop) < tolerance) {
            isAdjacent = true;
            relationship = 'bottom-to-top'; // target's bottom edge touches room's top edge
          } else if (Math.abs(targetTop - roomBottom) < tolerance) {
            isAdjacent = true;
            relationship = 'top-to-bottom'; // target's top edge touches room's bottom edge
          }
        }
      }

      if (isAdjacent) {
        adjacent.push({ room, relationship });
      }
    }

    return adjacent;
  };

  // Enhanced snapping that includes room corners and edges
  const snapToRoomsAndGrid = (x, y, forceDisable = false) => {
    if (!snapToGrid || forceDisable || isShiftPressed) return { x, y };

    const snapDistance = 10; // pixels
    let snappedX = x;
    let snappedY = y;

    // First try to snap to room corners and edges
    for (const room of rooms) {
      const roomCorners = [
        { x: room.x, y: room.y }, // top-left
        { x: room.x + room.width, y: room.y }, // top-right
        { x: room.x, y: room.y + room.height }, // bottom-left
        { x: room.x + room.width, y: room.y + room.height }, // bottom-right
      ];

      // Snap to corners
      for (const corner of roomCorners) {
        if (Math.abs(x - corner.x) < snapDistance && Math.abs(y - corner.y) < snapDistance) {
          return { x: corner.x, y: corner.y };
        }
      }

      // Snap to edges
      // Top/bottom edges
      if (Math.abs(y - room.y) < snapDistance && x >= room.x - snapDistance && x <= room.x + room.width + snapDistance) {
        snappedY = room.y;
      } else if (Math.abs(y - (room.y + room.height)) < snapDistance && x >= room.x - snapDistance && x <= room.x + room.width + snapDistance) {
        snappedY = room.y + room.height;
      }

      // Left/right edges
      if (Math.abs(x - room.x) < snapDistance && y >= room.y - snapDistance && y <= room.y + room.height + snapDistance) {
        snappedX = room.x;
      } else if (Math.abs(x - (room.x + room.width)) < snapDistance && y >= room.y - snapDistance && y <= room.y + room.height + snapDistance) {
        snappedX = room.x + room.width;
      }
    }

    // If no room snapping occurred, fall back to grid snapping
    if (snappedX === x) snappedX = snapToGridIfEnabled(x, forceDisable);
    if (snappedY === y) snappedY = snapToGridIfEnabled(y, forceDisable);

    return { x: snappedX, y: snappedY };
  };

  const saveToHistory = (newRooms, actionDescription) => {
    const newAction = {
      rooms: JSON.parse(JSON.stringify(newRooms)), // Deep copy
      description: actionDescription,
      timestamp: Date.now()
    };

    // Remove any actions after current index (when undoing then doing new action)
    const newHistory = actionHistory.slice(0, historyIndex + 1);
    newHistory.push(newAction);

    // Keep only last 50 actions to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }

    setActionHistory(newHistory);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const previousState = actionHistory[historyIndex - 1];
      setRooms(previousState.rooms);
      setHistoryIndex(historyIndex - 1);
      setSelectedRoom(null);
      showNotification(`Undid: ${actionHistory[historyIndex].description}`, 'info');
    } else {
      showNotification('Nothing to undo', 'warning');
    }
  };

  const handleRedo = () => {
    if (historyIndex < actionHistory.length - 1) {
      const nextState = actionHistory[historyIndex + 1];
      setRooms(nextState.rooms);
      setHistoryIndex(historyIndex + 1);
      setSelectedRoom(null);
      showNotification(`Redid: ${nextState.description}`, 'info');
    } else {
      showNotification('Nothing to redo', 'warning');
    }
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  // Dimension editing functions
  const handleDimensionClick = (room, edge) => {
    const currentValue = edge === 'width' ? room.width : room.height;
    setEditingDimension({ roomId: room.id, edge, value: currentValue });
    setDimensionInput(formatDimension(currentValue));
  };

  const handleDimensionSave = () => {
    if (!editingDimension) return;

    const newUnits = parseDimensionInput(dimensionInput);
    if (newUnits === null) {
      showNotification('Invalid dimension format. Use formats like "12ft", "3.5m", or "24"', 'error');
      return;
    }

    const newPixels = unitsToPixels(newUnits);
    const targetRoom = rooms.find(r => r.id === editingDimension.roomId);
    if (!targetRoom) return;

    // Check if this dimension change will actually affect other rooms
    const oldValue = editingDimension.edge === 'width' ? targetRoom.width : targetRoom.height;
    const delta = newPixels - oldValue;

    // Find adjacent rooms that would be affected by this specific change
    const adjacentRooms = findAdjacentRooms(targetRoom, editingDimension.edge);
    const affectedRooms = adjacentRooms.filter(({ relationship }) => {
      if (editingDimension.edge === 'width') {
        // Width changes only affect rooms when the room is growing/shrinking to the right
        // and there's a room touching the right edge (right-to-left relationship)
        return relationship === 'right-to-left' && delta !== 0;
      } else {
        // Height changes only affect rooms when the room is growing/shrinking downward
        // and there's a room touching the bottom edge (bottom-to-top relationship)
        return relationship === 'bottom-to-top' && delta !== 0;
      }
    });

    if (affectedRooms.length > 0) {
      // Show constraint options
      setConstraintPreview({
        targetRoom,
        edge: editingDimension.edge,
        newValue: newPixels,
        adjacentRooms: affectedRooms,
        originalValue: editingDimension.value
      });
    } else {
      // No constraints, just resize
      applyDimensionChange(targetRoom, editingDimension.edge, newPixels, 'resize-only');
    }
  };

  const applyDimensionChange = (targetRoom, edge, newPixels, mode) => {
    const newRooms = [...rooms];
    const targetIndex = newRooms.findIndex(r => r.id === targetRoom.id);

    if (targetIndex === -1) return;

    const oldValue = edge === 'width' ? targetRoom.width : targetRoom.height;
    const delta = newPixels - oldValue;

    // Update target room
    if (edge === 'width') {
      newRooms[targetIndex] = { ...targetRoom, width: newPixels };
    } else {
      newRooms[targetIndex] = { ...targetRoom, height: newPixels };
    }

    if (mode === 'push-pull' && constraintPreview) {
      // Apply push/pull to adjacent rooms
      for (const { room, relationship } of constraintPreview.adjacentRooms) {
        const roomIndex = newRooms.findIndex(r => r.id === room.id);
        if (roomIndex === -1) continue;

        if (edge === 'width') {
          if (relationship === 'right-to-left') {
            // Target's right edge is pushing room's left edge
            newRooms[roomIndex] = { ...newRooms[roomIndex], x: room.x + delta };
          }
          // left-to-right case: target shrinks/grows left, doesn't affect adjacent room position
        } else if (edge === 'height') {
          if (relationship === 'bottom-to-top') {
            // Target's bottom edge is pushing room's top edge
            newRooms[roomIndex] = { ...newRooms[roomIndex], y: room.y + delta };
          }
          // top-to-bottom case: target shrinks/grows up, doesn't affect adjacent room position
        }
      }
    }

    setRooms(newRooms);
    saveToHistory(newRooms, `Changed ${targetRoom.name} ${edge} to ${formatDimension(newPixels)}`);

    // Clear editing state
    setEditingDimension(null);
    setDimensionInput('');
    setConstraintPreview(null);
  };

  const cancelDimensionEdit = () => {
    setEditingDimension(null);
    setDimensionInput('');
    setConstraintPreview(null);
  };

  // Handle electrical component placement
  const handleElectricalComponentPlaced = async (componentData) => {
    // Declare localComponent outside try-catch so it's accessible in catch block
    let localComponent;

    try {
      // Add to local state immediately for responsiveness
      localComponent = {
        ...componentData,
        id: `temp-${Date.now()}`, // Temporary ID
      };

      setElectricalComponents([...electricalComponents, localComponent]);

      // Save to backend
      const savedComponent = await saveElectricalComponent(componentData);

      // Update with real ID from backend - FIX: Preserve backend data, only override specific frontend properties
      setElectricalComponents(prev =>
        prev.map(comp =>
          comp.id === localComponent.id
            ? { 
                ...savedComponent, // Backend data (with proper wattage, circuit_id, etc.)
                type: componentData.type, // Preserve frontend type
                x: componentData.x, // Preserve frontend position
                y: componentData.y,
                properties: { ...savedComponent.properties, ...componentData.properties } // Merge properties
              }
            : comp
        )
      );

      showNotification(`${componentData.type} added successfully (${savedComponent.wattage}W)`, 'success');
      setSelectedElectricalTool(null);
      clearPreview();
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error('Error placing electrical component:', error);

      // Remove from local state if backend save failed (only if localComponent was created)
      if (localComponent) {
        setElectricalComponents(prev =>
          prev.filter(comp => comp.id !== localComponent.id)
        );
      }

      showNotification('Failed to add electrical component', 'error');
    }
  };

  // Enhanced component editing with dialog
  const [componentEditDialog, setComponentEditDialog] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [componentLabel, setComponentLabel] = useState('');

  // Handle electrical component double-click (edit)
  const handleElectricalComponentDoubleClick = (component) => {
    setEditingComponent(component);
    setComponentLabel(component.label || component.type);
    setComponentEditDialog(true);
  };

  const handleSaveComponentEdit = async () => {
    if (!editingComponent) return;

    try {
      const updatedComponent = {
        ...editingComponent,
        label: componentLabel.trim() || editingComponent.type
      };

      // Update local state
      setElectricalComponents(prev =>
        prev.map(comp =>
          comp.id === editingComponent.id ? updatedComponent : comp
        )
      );

      // Update backend with all electrical properties
      const updatePayload = {
        label: updatedComponent.label,
        x: updatedComponent.x,
        y: updatedComponent.y,
        device_type_id: updatedComponent.device_type_id,
        room_id: updatedComponent.room_id,
        floor_plan_id: updatedComponent.floor_plan_id,
        voltage: updatedComponent.voltage,
        amperage: updatedComponent.amperage,
        wattage: updatedComponent.wattage,
        gfci: updatedComponent.gfci,
        circuit_id: updatedComponent.circuit_id,
        properties: updatedComponent.properties
      };

      await fetch(`${config.BACKEND_URL}/api/entities/${editingComponent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      showNotification(`${updatedComponent.type} updated`, 'success');
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error('Error updating component:', error);
      showNotification('Failed to update component', 'error');
    }

    setComponentEditDialog(false);
    setEditingComponent(null);
    setComponentLabel('');
  };

  const handleDeleteComponentFromEdit = () => {
    if (editingComponent) {
      handleDeleteElectricalComponent(editingComponent);
      setComponentEditDialog(false);
      setEditingComponent(null);
      setComponentLabel('');
    }
  };

  // Helper function to get SVG coordinates from mouse event
  const getSVGPoint = useCallback((event) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const transform = svg.getScreenCTM().inverse();
    const svgPoint = point.matrixTransform(transform);

    return { x: svgPoint.x, y: svgPoint.y };
  }, []);

  const handleMouseDown = useCallback((event) => {
    event.preventDefault();
    const svgPoint = getSVGPoint(event);

    // Check for middle mouse button or space+left click for panning
    if (event.button === 1 || (event.button === 0 && spaceKeyPressed.current)) {
      setIsPanning(true);
      setPanStart({ x: event.clientX, y: event.clientY });
      return;
    }

    // Handle electrical mode
    if (currentMode === 'electrical' && selectedElectricalTool) {
      handleComponentPlacement(event, selectedElectricalTool, handleElectricalComponentPlaced);
      return;
    }

    // Handle room mode
    if (currentMode === 'rooms') {
      if (mode === 'draw') {
        const snapped = snapToRoomsAndGrid(svgPoint.x, svgPoint.y);
        setStartPoint(snapped);
        setCurrentRect({ x: snapped.x, y: snapped.y, width: 0, height: 0 });
        return;
      }

      // Check if clicking on a room for move/resize
      const clickedRoom = rooms.find(room => {
        return svgPoint.x >= room.x &&
               svgPoint.x <= room.x + room.width &&
               svgPoint.y >= room.y &&
               svgPoint.y <= room.y + room.height;
      });

      if (clickedRoom) {
        // Save initial room state for history
        setDragStartRoomState({
          id: clickedRoom.id,
          x: clickedRoom.x,
          y: clickedRoom.y,
          width: clickedRoom.width,
          height: clickedRoom.height
        });

        // Check if clicking on resize handles
        const handleSize = 10;
        const rightHandle = svgPoint.x >= clickedRoom.x + clickedRoom.width - handleSize;
        const bottomHandle = svgPoint.y >= clickedRoom.y + clickedRoom.height - handleSize;

        if (rightHandle || bottomHandle) {
          setMode('resize');
          setSelectedRoom(clickedRoom);
          setResizeHandle({ rightHandle, bottomHandle });
          setDragStart(svgPoint);
        } else {
          setMode('move');
          setSelectedRoom(clickedRoom);
          setDragStart({
            x: svgPoint.x - clickedRoom.x,
            y: svgPoint.y - clickedRoom.y
          });
        }
      } else {
        setSelectedRoom(null);
        setMode('select');
      }
    }
  }, [currentMode, selectedElectricalTool, handleComponentPlacement, handleElectricalComponentPlaced, mode, rooms, getSVGPoint]);

  const handleMouseMove = useCallback((event) => {
    const svgPoint = getSVGPoint(event);
    const isShiftPressed = event.shiftKey;

    // Handle panning
    if (isPanning && panStart) {
      const deltaX = event.clientX - panStart.x;
      const deltaY = event.clientY - panStart.y;

      const [x, y, width, height] = viewBox.split(' ').map(Number);

      // Calculate pan speed based on current zoom level
      const panSpeed = width / 800; // Adjust pan speed based on zoom

      const newX = x - deltaX * panSpeed;
      const newY = y - deltaY * panSpeed;

      setViewBox(`${newX} ${newY} ${width} ${height}`);
      setPanStart({ x: event.clientX, y: event.clientY });
      return;
    }

    // Handle electrical mode component preview
    if (currentMode === 'electrical' && selectedElectricalTool) {
      handleComponentMouseMove(event, selectedElectricalTool);
      return;
    }

    // Handle room mode interactions
    if (currentMode === 'rooms') {
      if (mode === 'draw' && startPoint) {
        const snapped = snapToRoomsAndGrid(svgPoint.x, svgPoint.y);
        const width = snapped.x - startPoint.x;
        const height = snapped.y - startPoint.y;

        setCurrentRect({
          x: width < 0 ? snapped.x : startPoint.x,
          y: height < 0 ? snapped.y : startPoint.y,
          width: Math.abs(width),
          height: Math.abs(height)
        });
      } else if (mode === 'move' && selectedRoom && dragStart) {
        const snapped = snapToRoomsAndGrid(svgPoint.x - dragStart.x, svgPoint.y - dragStart.y);

        setRooms(rooms.map(room =>
          room.id === selectedRoom.id
            ? { ...room, x: snapped.x, y: snapped.y }
            : room
        ));
      } else if (mode === 'resize' && selectedRoom && dragStart && resizeHandle) {
        // Calculate new dimensions based on current mouse position
        const newWidth = resizeHandle.rightHandle
          ? Math.max(scaleSettings.pixelsPerUnit, svgPoint.x - selectedRoom.x)
          : selectedRoom.width;
        const newHeight = resizeHandle.bottomHandle
          ? Math.max(scaleSettings.pixelsPerUnit, svgPoint.y - selectedRoom.y)
          : selectedRoom.height;

        // Apply snapping to the new dimensions
        const snappedWidth = resizeHandle.rightHandle
          ? snapToGridIfEnabled(newWidth, isShiftPressed)
          : selectedRoom.width;
        const snappedHeight = resizeHandle.bottomHandle
          ? snapToGridIfEnabled(newHeight, isShiftPressed)
          : selectedRoom.height;

        setRooms(rooms.map(room =>
          room.id === selectedRoom.id
            ? { ...room, width: snappedWidth, height: snappedHeight }
            : room
        ));
      }
    }
  }, [currentMode, selectedElectricalTool, handleComponentMouseMove, mode, startPoint, selectedRoom, dragStart, resizeHandle, rooms, getSVGPoint, setRooms, snapToGridIfEnabled, isPanning, panStart, viewBox]);

  const handleMouseUp = useCallback(() => {
    // Stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (mode === 'draw' && currentRect && currentRect.width > 20 && currentRect.height > 20) {
      const newRoom = {
        id: `room-${Date.now()}`,
        name: `Room ${rooms.length + 1}`,
        ...currentRect
      };

      const newRooms = [...rooms, newRoom];
      setRooms(newRooms);
      saveToHistory(newRooms, `Created room "${newRoom.name}"`);
      setSelectedRoom(newRoom);
      setRoomName(newRoom.name);
      setEditDialog(true);
      setCurrentRect(null);
      setStartPoint(null);
      setMode('select');
    } else if (mode === 'move' || mode === 'resize') {
      // Save to history if room was actually moved/resized
      if (selectedRoom && dragStartRoomState) {
        const currentRoom = rooms.find(r => r.id === selectedRoom.id);
        if (currentRoom) {
          const moved = currentRoom.x !== dragStartRoomState.x || currentRoom.y !== dragStartRoomState.y;
          const resized = currentRoom.width !== dragStartRoomState.width || currentRoom.height !== dragStartRoomState.height;

          if (moved || resized) {
            const actionDesc = mode === 'move' ?
              `Moved room "${currentRoom.name}"` :
              `Resized room "${currentRoom.name}"`;
            saveToHistory(rooms, actionDesc);
          }
        }
      }

      setMode('select');
      setDragStart(null);
      setResizeHandle(null);
      setDragStartRoomState(null);
    }

    setCurrentRect(null);
    setStartPoint(null);
  }, [mode, currentRect, rooms, isPanning]);

  const handleRoomDoubleClick = (room) => {
    setSelectedRoom(room);
    setRoomName(room.name);
    setEditDialog(true);
  };

  const getCursor = () => {
    if (isPanning) return 'grabbing';

    switch (mode) {
      case 'draw': return 'crosshair';
      case 'move': return 'move';
      case 'resize': return 'nw-resize';
      default: return 'grab';
    }
  };

  const handleSaveRoom = () => {
    if (selectedRoom) {
      const newRooms = rooms.map(room =>
        room.id === selectedRoom.id
          ? { ...room, name: roomName }
          : room
      );
      setRooms(newRooms);
      saveToHistory(newRooms, `Renamed room to "${roomName}"`);
    }
    setEditDialog(false);
    setSelectedRoom(null);
    setRoomName('');
  };

  const handleDeleteRoom = () => {
    if (selectedRoom) {
      setDeleteRoomDialog({ open: true, room: selectedRoom });
    }
  };

  const handleConfirmDeleteRoom = () => {
    const { room } = deleteRoomDialog;
    if (room) {
      const newRooms = rooms.filter(r => r.id !== room.id);
      setRooms(newRooms);
      saveToHistory(newRooms, `Deleted room "${room.name}"`);
      setSelectedRoom(null);
      showNotification(`Room "${room.name}" deleted`, 'info');
    }
    setDeleteRoomDialog({ open: false, room: null });
    setEditDialog(false);
    setRoomName('');
  };

  const handleSaveFloorPlan = async () => {
    if (!floorPlanName.trim()) {
      showNotification('Please enter a name for your floor plan', 'error');
      return;
    }

    // Prevent duplicate saves
    if (isSaving) {
      showNotification('Save in progress, please wait...', 'warning');
      return;
    }

    // Note: Duplicate name checking removed for simplified single-project workflow

    setIsSaving(true);

    const floorPlanData = {
      name: floorPlanName,
      rooms: rooms,
      viewBox: initialFloorPlan?.view_box || initialFloorPlan?.viewBox || '0 0 800 600',
      svg: generateSVG().svg
    };

    try {
      let savedPlan;

      // If we have an existing floor plan, update it
      if (currentPlan?.id) {
        // Update existing floor plan
        const response = await fetch(`${config.BACKEND_URL}/api/floor-plans/${currentPlan.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: currentPlan.name,
            rooms_data: JSON.stringify(rooms),
            view_box: viewBox,
            svg_content: generateSVG().svg
          }),
        });

        if (response.ok) {
          savedPlan = await response.json();
          showNotification(`Floor plan "${floorPlanName}" updated successfully!`, 'success');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Server update failed');
        }
              } else {
          // Create new floor plan
          const response = await fetch(`${config.BACKEND_URL}/api/floor-plans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: floorPlanName,
            rooms_data: JSON.stringify(rooms),
            view_box: viewBox,
            svg_content: generateSVG().svg
          }),
        });

        if (response.ok) {
          savedPlan = await response.json();
          showNotification(`Floor plan "${floorPlanName}" saved successfully!`, 'success');
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Server save failed');
        }
      }

      // Use the plan data returned from the server
      const newPlan = {
        ...savedPlan,
        rooms: savedPlan.rooms || floorPlanData.rooms
      };

      // Update current plan reference
      setCurrentPlan(newPlan);

    } catch (error) {
      console.error('Save error:', error);

      // Show specific error message
      if (error.message.includes('already exists')) {
        showNotification(error.message, 'error');
        // Don't clear electrical components on name conflict
        setIsSaving(false);
        return;
      }

      // Fallback to localStorage for other errors
      console.warn('Server save failed, using local storage');
      try {
        const localPlan = saveFloorPlanLocal({
          ...floorPlanData,
          id: currentPlan?.id || Date.now(),
          createdAt: new Date().toISOString()
        });

        setCurrentPlan(localPlan);
        showNotification(`Floor plan "${floorPlanName}" saved locally!`, 'warning');
      } catch (localError) {
        console.error('Local save also failed:', localError);
        showNotification('Failed to save floor plan. Please try again.', 'error');
        setIsSaving(false);
        return;
      }
    } finally {
      setIsSaving(false);
    }

    setShowSaveDialog(false);
    setHasUnsavedChanges(false);
  };

  const handleSave = () => {
    // If we have a current plan (existing saved plan), save directly without dialog
    if (currentPlan?.name && floorPlanName) {
      handleSaveFloorPlan();
    } else {
      // New plan - show dialog to get name
      setShowSaveDialog(true);
    }
  };

  // Save As functionality removed for simplified single-project workflow

  // Load and delete functionality removed for simplified single-project workflow

  const generateSVG = () => {
    const svgContent = rooms.map(room => `
      <rect id="${room.id}" x="${room.x}" y="${room.y}" width="${room.width}" height="${room.height}"
            fill="none" stroke="black" stroke-width="2"/>
      <text x="${room.x + room.width/2}" y="${room.y + room.height/2}"
            text-anchor="middle" dominant-baseline="middle" fill="black">${room.name}</text>
    `).join('');

    return {
      viewBox: initialFloorPlan?.view_box || initialFloorPlan?.viewBox || '0 0 800 600',
      svg: svgContent
    };
  };

  // *************** ELECTRICAL COMPONENT MANAGEMENT ***************

  // Load electrical data for current floor plan
  const loadElectricalData = async (floorPlanId) => {
    if (!floorPlanId) return;

    setIsLoadingElectrical(true);
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/entities`);
      if (response.ok) {
        const entities = await response.json();

        // Filter entities for this floor plan and convert to component format
        const floorPlanComponents = entities
          .filter(entity => entity.floor_plan_id === floorPlanId)
          .map(entity => ({
            id: entity.id,
            type: getComponentTypeFromDeviceTypeId(entity.device_type_id),
            x: entity.x,
            y: entity.y,
            label: entity.label || getComponentTypeFromDeviceTypeId(entity.device_type_id),
            room_id: entity.room_id,
            device_type_id: entity.device_type_id,
            breaker_id: entity.breaker_id
          }));

        setElectricalComponents(floorPlanComponents);
        if (floorPlanComponents.length > 0) {
          showNotification(`${floorPlanComponents.length} electrical components loaded`, 'success');
        }
      } else {
        console.warn('Failed to load entities');
        setElectricalComponents([]);
      }
    } catch (error) {
      console.warn('Failed to load electrical data:', error);
      setElectricalComponents([]);
    } finally {
      setIsLoadingElectrical(false);
    }
  };

  // Helper function to convert device_type_id back to component type
  const getComponentTypeFromDeviceTypeId = (deviceTypeId) => {
    // Use deviceTypesService for dynamic resolution instead of hardcoded mapping
    return deviceTypesService.getComponentType(deviceTypeId) || 'outlet';
  };

  // Save electrical component to backend
  const saveElectricalComponent = async (component) => {
    try {
      // Ensure device types are loaded
      await deviceTypesService.fetchDeviceTypes();
      
      // ENHANCED FLOOR PLAN ID DETECTION
      // Try multiple strategies to get the current floor plan ID
      let activeFloorPlanId = null;
      
      // Strategy 1: Use currentPlan.id if available
      if (currentPlan?.id) {
        activeFloorPlanId = currentPlan.id;
        console.log(`🎯 Using currentPlan.id: ${activeFloorPlanId}`);
      }
      
      // Strategy 2: If currentPlan.id is null, try to get the most recent floor plan
      if (!activeFloorPlanId) {
        try {
          const floorPlansResponse = await fetch(`${config.BACKEND_URL}/api/floor-plans`);
          if (floorPlansResponse.ok) {
            const floorPlans = await floorPlansResponse.json();
            if (floorPlans && floorPlans.length > 0) {
              // Get the most recently updated floor plan
              const mostRecentPlan = floorPlans.sort((a, b) => 
                new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
              )[0];
              activeFloorPlanId = mostRecentPlan.id;
              console.log(`🔍 Using most recent floor plan: ${activeFloorPlanId} (${mostRecentPlan.name})`);
              
              // Update currentPlan state for future saves
              setCurrentPlan(mostRecentPlan);
            }
          }
        } catch (error) {
          console.warn('Failed to fetch floor plans for ID detection:', error);
        }
      }
      
      // Strategy 3: Final fallback - warn user
      if (!activeFloorPlanId) {
        console.error('⚠️ No floor plan ID detected! Component may not persist correctly.');
        showNotification('Warning: No active floor plan detected. Component may not save properly.', 'warning');
      }

      // Always resolve device_type_id from component.type to ensure correctness
      // The component.type is the source of truth (e.g., 'outlet', 'light', 'appliance')
      // This ensures we get the correct device_type_id from the database, not hardcoded values
      const finalDeviceTypeId = getDeviceTypeId(component.type, component.properties?.appliance_type);
      console.log(`🔧 Resolved device_type_id for ${component.type}${component.properties?.appliance_type ? ` (${component.properties.appliance_type})` : ''}: ${finalDeviceTypeId}`);

      // Map component data to match backend entities structure
      const entityData = {
        device_type_id: finalDeviceTypeId,
        x: component.x,
        y: component.y,
        breaker_id: component.breaker_id || null,
        room_id: component.room_id || null,
        floor_plan_id: activeFloorPlanId, // FIXED: Use detected active floor plan ID
        label: component.label || component.type,
        voltage: component.voltage || 120,
        amperage: component.amperage || 15,
        wattage: component.wattage || 0,
        gfci: component.gfci || false,
        circuit_id: component.circuit_id || null,
        properties: component.properties || {}
      };

      console.log(`💾 Saving component with floor_plan_id: ${activeFloorPlanId}`, entityData);

      const response = await fetch(`${config.BACKEND_URL}/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const savedEntity = await response.json();

      // Return component in the format expected by frontend
      return {
        id: savedEntity.id,
        type: component.type,
        x: component.x,
        y: component.y,
        label: component.label || component.type,
        room_id: component.room_id,
        device_type_id: entityData.device_type_id,
        voltage: entityData.voltage,
        amperage: entityData.amperage,
        wattage: entityData.wattage,
        gfci: entityData.gfci,
        circuit_id: entityData.circuit_id,
        floor_plan_id: savedEntity.floor_plan_id, // Include floor_plan_id in return
        properties: entityData.properties
      };
    } catch (error) {
      console.error('Error saving electrical component:', error);
      // Fallback: create component with local ID
      return { ...component, id: `comp_${Date.now()}` };
    }
  };

  // Handle electrical component selection
  const handleElectricalComponentSelect = (component) => {
    setSelectedComponent(component);
    setSelectedRoom(null); // Clear room selection when selecting electrical component
  };

  // Delete electrical component
  const handleDeleteElectricalComponent = async (component) => {
    if (!component) return;

    try {
      await fetch(`${config.BACKEND_URL}/api/entities/${component.id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.warn('Failed to delete component from server:', error);
    }

    const newComponents = electricalComponents.filter(c => c.id !== component.id);
    setElectricalComponents(newComponents);
    setSelectedComponent(null);
    showNotification(`${component.type} deleted`, 'info');
    setHasUnsavedChanges(true);
  };

  // Handle mode switching
  const handleModeChange = (event, newMode) => {
    if (newMode !== null) {
      setCurrentMode(newMode);
      // Clear selections when switching modes
      setSelectedRoom(null);
      setSelectedComponent(null);
      setSelectedElectricalTool(null);
      clearPreview();
    }
  };

  // Load electrical data when floor plan changes
  useEffect(() => {
    if (currentPlan?.id) {
      loadElectricalData(currentPlan.id);
      loadElectricalSystemData(currentPlan.id);
    }
  }, [currentPlan?.id]);

  // Load electrical system data (panels only - circuits removed for simplicity)
  const loadElectricalSystemData = async (floorPlanId) => {
    if (!floorPlanId) return;

    try {
      // Load panels only
      const panelsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/panels?floor_plan_id=${floorPlanId}`);
      if (panelsResponse.ok) {
        const panelsData = await panelsResponse.json();
        setElectricalPanels(panelsData);
      }
    } catch (error) {
      console.warn('Failed to load electrical system data:', error);
    }
  };

  // Create default panel if none exists
  const createDefaultPanel = async () => {
    if (!currentPlan?.id) return;

    try {
      const defaultPanel = {
        floor_plan_id: currentPlan.id,
        panel_name: 'Main Panel',
        x_position: 50,
        y_position: 50,
        panel_type: 'residential',
        main_breaker_amps: 200,
        total_positions: 30
      };

      const response = await fetch(`${config.BACKEND_URL}/api/electrical/panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultPanel)
      });

      if (response.ok) {
        const savedPanel = await response.json();
        const newPanel = { ...defaultPanel, id: savedPanel.id };
        setElectricalPanels([newPanel]);
        showNotification('Default electrical panel created', 'success');
        return newPanel;
      }
    } catch (error) {
      console.error('Failed to create default panel:', error);
    }
  };

  // Handle panel placement/movement
  const handlePanelDoubleClick = (panel) => {
    setSelectedPanel(panel);
    // Could open panel editing dialog here
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Drawing Tools Toolbar - Floating on Canvas */}
        {!electricalModeOnly && (
          <Box sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000,
            display: 'flex',
            gap: 1,
            backgroundColor: darkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: 2,
            padding: 1,
            boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
            border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
          }}>
            <Button
              variant={mode === 'draw' ? "contained" : "outlined"}
              startIcon={<AddIcon />}
              onClick={() => setMode(mode === 'draw' ? 'select' : 'draw')}
              size="small"
              title={mode === 'draw' ? 'Stop Drawing' : (rooms.length === 0 ? 'Add First Room' : 'Add Room')}
            >
              {mode === 'draw' ? 'Stop' : 'Add Room'}
            </Button>
            <Button
              variant={mode === 'select' ? "contained" : "outlined"}
              startIcon={<OpenWithIcon />}
              onClick={() => setMode('select')}
              size="small"
              title="Select & Move rooms"
            >
              Move
            </Button>
            <Button
              variant={(snapToGrid && !isShiftPressed) ? "contained" : "outlined"}
              startIcon={(snapToGrid && !isShiftPressed) ? <GridOnIcon /> : <GridOffIcon />}
              onClick={() => setSnapToGrid(!snapToGrid)}
              size="small"
              title={isShiftPressed ? "Snap disabled (Shift held)" : `Snap to rooms & grid: ${snapToGrid ? 'ON' : 'OFF'}`}
              sx={{
                opacity: isShiftPressed ? 0.5 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {isShiftPressed ? 'Off' : 'Snap'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<UndoIcon />}
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              size="small"
              title="Undo"
            >
              Undo
            </Button>
            <Button
              variant="outlined"
              startIcon={<RedoIcon />}
              onClick={handleRedo}
              disabled={historyIndex >= actionHistory.length - 1}
              size="small"
              title="Redo"
            >
              Redo
            </Button>
          </Box>
        )}

        {/* Electrical Tools Toolbar - Floating on Canvas */}
        {electricalModeOnly && (
          <Box sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: 2,
            padding: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxWidth: 250
          }}>
            {rooms.length === 0 ? (
              <Typography variant="caption" color="warning.main">
                <span role="img" aria-label="warning">⚠️</span> Create rooms first
              </Typography>
            ) : (
              <>
                {isLoadingElectrical ? (
                  <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                    Loading electrical components...
                  </Typography>
                ) : (
                  <>
                    <Typography variant="caption" color="textSecondary" gutterBottom>
                      {selectedElectricalTool
                        ? `Click to place ${selectedElectricalTool.name}`
                        : 'Select an electrical component:'
                      }
                    </Typography>
                    <ElectricalSymbolPalette
                      onSelect={setSelectedElectricalTool}
                      selected={selectedElectricalTool}
                    />

                    {electricalPanels.length === 0 && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={createDefaultPanel}
                      >
                        Add Panel
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        )}

        {/* Zoom Controls */}
        {/* Save & Help Controls - Top Right */}
        <Box sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          display: 'flex',
          gap: 1,
          backgroundColor: darkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 2,
          padding: 1,
          boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
        }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={rooms.length === 0 || isSaving}
            color={hasUnsavedChanges ? "warning" : "primary"}
            size="small"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<HelpIcon />}
            onClick={() => setShowHelpDialog(true)}
            size="small"
          >
            Help
          </Button>
        </Box>

        {/* Status/Progress Indicator - Bottom Left */}
        {!electricalModeOnly && rooms.length > 0 && (
          <Box sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: darkMode ? 'rgba(42, 42, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: 2,
            padding: 2,
            boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.15)',
            border: darkMode ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(76, 175, 80, 0.2)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {rooms.length} room{rooms.length !== 1 ? 's' : ''} created
              </Typography>
            </Box>
            {showProceedButton && (
              <Button
                variant="contained"
                color="success"
                onClick={onProceedToPanels}
                size="medium"
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                }}
              >
                Proceed to Panel Setup
              </Button>
            )}
          </Box>
        )}

        {/* Zoom Controls - Bottom Right (above scale) */}
        <Box sx={{
          position: 'absolute',
          bottom: 120,
          right: 16,
          zIndex: 1000,
          backgroundColor: darkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 2,
          padding: 1,
          boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const [x, y, width, height] = viewBox.split(' ').map(Number);
              const newWidth = width * 0.8;
              const newHeight = height * 0.8;
              const newX = x + (width - newWidth) / 2;
              const newY = y + (height - newHeight) / 2;
              const newViewBox = `${newX} ${newY} ${newWidth} ${newHeight}`;
              setViewBox(newViewBox);
            }}
            sx={{ minWidth: 40 }}
            title="Zoom In"
          >
            +
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const [x, y, width, height] = viewBox.split(' ').map(Number);
              const newWidth = width * 1.25;
              const newHeight = height * 1.25;
              const newX = x - (newWidth - width) / 2;
              const newY = y - (newHeight - height) / 2;
              const newViewBox = `${newX} ${newY} ${newWidth} ${newHeight}`;
              setViewBox(newViewBox);
            }}
            sx={{ minWidth: 40 }}
            title="Zoom Out"
          >
            -
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setViewBox("0 0 800 600");
            }}
            sx={{ minWidth: 40, fontSize: '10px' }}
            title="Reset View"
          >
            Reset
          </Button>
        </Box>

        {/* Scale Bar - Bottom Right */}
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: darkMode ? 'rgba(42, 42, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 1,
          padding: 1,
          boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
          border: darkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1
        }}>
          <Typography variant="caption" color="textSecondary" sx={{ fontSize: '10px' }}>
            Scale
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: `${scaleSettings.pixelsPerUnit * 5}px`,
              height: '3px',
              backgroundColor: darkMode ? '#ccc' : '#333',
              position: 'relative'
            }}>
              <Box sx={{ position: 'absolute', left: 0, top: '-8px', width: '1px', height: '14px', backgroundColor: darkMode ? '#ccc' : '#333' }} />
              <Box sx={{ position: 'absolute', right: 0, top: '-8px', width: '1px', height: '14px', backgroundColor: darkMode ? '#ccc' : '#333' }} />
            </Box>
            <Typography variant="caption" sx={{ fontSize: '10px', minWidth: '30px' }}>
              5{scaleSettings.unit}
            </Typography>
          </Box>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowScaleDialog(true)}
            sx={{ fontSize: '9px', minHeight: 'auto', padding: '2px 4px' }}
          >
            Change
          </Button>
        </Box>

        {/* Pan Instructions */}
        <Box sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: 1,
          borderRadius: 1,
          fontSize: '12px',
          display: spaceKeyPressed.current ? 'block' : 'none'
        }}>
                     <span role="img" aria-label="mouse">🖱️</span> Hold Space + Drag to Pan
        </Box>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox}
          style={{
            cursor: isPanning ? 'grabbing' : getCursor(),
            background: darkMode ? '#2c2c2c' : '#f5f5f5'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={darkMode ? "#444444" : "#e0e0e0"} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#grid)" />

          {/* Existing rooms */}
          {rooms.map(room => {
            const isSelected = selectedRoom?.id === room.id;
            const adjacentRoomsWidth = findAdjacentRooms(room, 'width');
            const adjacentRoomsHeight = findAdjacentRooms(room, 'height');

            return (
              <g key={room.id}>
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  fill={isSelected ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)"}
                  stroke={isSelected ? "#1976d2" : "#1976d2"}
                  strokeWidth={isSelected ? "3" : "2"}
                  style={{ cursor: mode === 'select' ? 'pointer' : 'default' }}
                  onDoubleClick={() => handleRoomDoubleClick(room)}
                />

                {/* Room name */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={darkMode ? "#ffffff" : "#1976d2"}
                  fontSize="24"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {room.name}
                </text>

                {/* Dimension labels - always show if enabled */}
                {scaleSettings.showDimensions && (
                  <>
                    {/* Width dimension */}
                    <g>
                      {/* Dimension line */}
                      <line
                        x1={room.x}
                        y1={room.y - 15}
                        x2={room.x + room.width}
                        y2={room.y - 15}
                        stroke={darkMode ? "#ccc" : "#666"}
                        strokeWidth="1"
                      />
                      {/* End markers */}
                      <line x1={room.x} y1={room.y - 20} x2={room.x} y2={room.y - 10} stroke={darkMode ? "#ccc" : "#666"} strokeWidth="1" />
                      <line x1={room.x + room.width} y1={room.y - 20} x2={room.x + room.width} y2={room.y - 10} stroke={darkMode ? "#ccc" : "#666"} strokeWidth="1" />

                      {/* Clickable dimension text */}
                      <text
                        x={room.x + room.width / 2}
                        y={room.y - 18}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={darkMode ? "#ccc" : "#666"}
                        fontSize="12"
                        fontWeight="normal"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleDimensionClick(room, 'width');
                        }}
                        title="Double-click to edit width"
                      >
                        {formatDimension(room.width)}
                      </text>
                    </g>

                    {/* Height dimension */}
                    <g>
                      {/* Dimension line */}
                      <line
                        x1={room.x - 15}
                        y1={room.y}
                        x2={room.x - 15}
                        y2={room.y + room.height}
                        stroke={darkMode ? "#ccc" : "#666"}
                        strokeWidth="1"
                      />
                      {/* End markers */}
                      <line x1={room.x - 20} y1={room.y} x2={room.x - 10} y2={room.y} stroke={darkMode ? "#ccc" : "#666"} strokeWidth="1" />
                      <line x1={room.x - 20} y1={room.y + room.height} x2={room.x - 10} y2={room.y + room.height} stroke={darkMode ? "#ccc" : "#666"} strokeWidth="1" />

                      {/* Clickable dimension text */}
                      <text
                        x={room.x - 18}
                        y={room.y + room.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={darkMode ? "#ccc" : "#666"}
                        fontSize="12"
                        fontWeight="normal"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        transform={`rotate(-90, ${room.x - 18}, ${room.y + room.height / 2})`}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleDimensionClick(room, 'height');
                        }}
                        title="Double-click to edit height"
                      >
                        {formatDimension(room.height)}
                      </text>
                    </g>
                  </>
                )}

                {/* Shared wall indicators */}
                {adjacentRoomsWidth.length > 0 && (
                  <>
                    {adjacentRoomsWidth.map(({ room: adjRoom, relationship }, idx) => (
                      <line
                        key={`width-${idx}`}
                        x1={relationship === 'right-to-left' ? room.x + room.width : room.x}
                        y1={Math.max(room.y, adjRoom.y)}
                        x2={relationship === 'right-to-left' ? room.x + room.width : room.x}
                        y2={Math.min(room.y + room.height, adjRoom.y + adjRoom.height)}
                        stroke="#ff5722"
                        strokeWidth="4"
                        opacity="0.7"
                      />
                    ))}
                  </>
                )}
                {adjacentRoomsHeight.length > 0 && (
                  <>
                    {adjacentRoomsHeight.map(({ room: adjRoom, relationship }, idx) => (
                      <line
                        key={`height-${idx}`}
                        x1={Math.max(room.x, adjRoom.x)}
                        y1={relationship === 'bottom-to-top' ? room.y + room.height : room.y}
                        x2={Math.min(room.x + room.width, adjRoom.x + adjRoom.width)}
                        y2={relationship === 'bottom-to-top' ? room.y + room.height : room.y}
                        stroke="#ff5722"
                        strokeWidth="4"
                        opacity="0.7"
                      />
                    ))}
                  </>
                )}

                {/* Resize handles for selected room */}
                {selectedRoom?.id === room.id && mode === 'select' && (
                  <>
                    {/* Right handle */}
                    <rect
                      x={room.x + room.width - 5}
                      y={room.y + room.height / 2 - 5}
                      width="10"
                      height="10"
                      fill="#1976d2"
                      stroke="white"
                      strokeWidth="2"
                      style={{ cursor: 'ew-resize' }}
                    />
                    {/* Bottom handle */}
                    <rect
                      x={room.x + room.width / 2 - 5}
                      y={room.y + room.height - 5}
                      width="10"
                      height="10"
                      fill="#1976d2"
                      stroke="white"
                      strokeWidth="2"
                      style={{ cursor: 'ns-resize' }}
                    />
                    {/* Bottom-right corner handle */}
                    <rect
                      x={room.x + room.width - 5}
                      y={room.y + room.height - 5}
                      width="10"
                      height="10"
                      fill="#ff5722"
                      stroke="white"
                      strokeWidth="2"
                      style={{ cursor: 'nw-resize' }}
                    />
                  </>
                )}
            </g>
          );
        })}

          {/* Current drawing rectangle */}
          {currentRect && mode === 'draw' && (
            <rect
              x={currentRect.x}
              y={currentRect.y}
              width={currentRect.width}
              height={currentRect.height}
              fill="rgba(255, 152, 0, 0.2)"
              stroke="#ff9800"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Electrical Component Layer */}
          <ElectricalComponentLayer
            components={electricalComponents}
            selectedComponent={selectedComponent}
            onComponentSelect={handleElectricalComponentSelect}
            onComponentDoubleClick={handleElectricalComponentDoubleClick}
            visible={showElectricalLayer}
          />

          {/* Electrical Panels */}
          {electricalPanels.map(panel => (
            <PanelVisualization
              key={panel.id}
              panel={panel}
              circuits={[]}
              selected={selectedPanel?.id === panel.id}
              onSelect={() => setSelectedPanel(panel)}
              onDoubleClick={() => handlePanelDoubleClick(panel)}
            />
          ))}

          {/* Component placement preview */}
          <ComponentPreview previewComponent={previewComponent} />

          {/* Snap indicators */}
          {snapIndicators.map((indicator, index) => (
            <circle
              key={index}
              cx={indicator.x}
              cy={indicator.y}
              r="4"
              fill="none"
              stroke="#ff5722"
              strokeWidth="2"
              opacity="0.8"
            />
          ))}
        </svg>
      </Box>

      {/* Edit Room Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
        <DialogTitle>Edit Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveRoom();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteRoom} color="error" startIcon={<DeleteIcon />}>
            Delete
          </Button>
          <Button onClick={handleDuplicateRoom} startIcon={<ContentCopyIcon />}>
            Duplicate
          </Button>
          <Button onClick={() => setEditDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveRoom} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Electrical Component Dialog */}
      <Dialog open={componentEditDialog} onClose={() => setComponentEditDialog(false)}>
        <DialogTitle>Edit {editingComponent?.type}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Component Label"
            fullWidth
            value={componentLabel}
            onChange={(e) => setComponentLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveComponentEdit();
              }
            }}
            placeholder={editingComponent?.type}
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Position: ({Math.round(editingComponent?.x || 0)}, {Math.round(editingComponent?.y || 0)})
            {editingComponent?.room_id && ` • Room: ${editingComponent.room_id}`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteComponentFromEdit} color="error" startIcon={<DeleteIcon />}>
            Delete
          </Button>
          <Button onClick={() => setComponentEditDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveComponentEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Floor Plan Dialog */}
      <Dialog open={showSaveDialog} onClose={() => setShowSaveDialog(false)}>
        <DialogTitle>
          Save Floor Plan
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Floor Plan Name"
            fullWidth
            value={floorPlanName}
            onChange={(e) => setFloorPlanName(e.target.value)}
            placeholder="e.g., My House, Office Layout, etc."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && floorPlanName.trim()) {
                handleSaveFloorPlan();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSaveDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveFloorPlan} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>



      {/* Room Delete Confirmation Dialog */}
      <Dialog
        open={deleteRoomDialog.open}
        onClose={() => setDeleteRoomDialog({ open: false, room: null })}
        maxWidth="sm"
      >
        <DialogTitle>Confirm Delete Room</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the room <strong>"{deleteRoomDialog.room?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRoomDialog({ open: false, room: null })}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteRoom}
            color="error"
            variant="contained"
            autoFocus
          >
            Delete Room
          </Button>
        </DialogActions>
      </Dialog>



      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onClose={() => setShowHelpDialog(false)} maxWidth="md">
        <DialogTitle>Floor Plan Editor Help</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Drawing Tools</Typography>
          <Typography variant="body2" paragraph>
            • <strong>Add Room:</strong> Click and drag to create rectangular rooms<br/>
            • <strong>Move:</strong> Select and drag rooms to reposition them<br/>
            • <strong>Snap:</strong> Toggle grid and room edge snapping (Hold Shift to temporarily disable)<br/>
            • <strong>Undo/Redo:</strong> Navigate through your editing history
          </Typography>

          <Typography variant="h6" gutterBottom>Navigation</Typography>
          <Typography variant="body2" paragraph>
            • <strong>Space + Drag:</strong> Pan around the canvas<br/>
            • <strong>Middle Mouse + Drag:</strong> Pan around the canvas<br/>
            • <strong>Mouse Wheel:</strong> Zoom in/out (if zoom controls enabled)
          </Typography>

          <Typography variant="h6" gutterBottom>Keyboard Shortcuts</Typography>
          <Typography variant="body2" paragraph>
            • <strong>Delete/Backspace:</strong> Delete selected room<br/>
            • <strong>Ctrl/Cmd + D:</strong> Duplicate selected room<br/>
            • <strong>Shift:</strong> Temporarily disable snapping while held
          </Typography>

          <Typography variant="h6" gutterBottom>Dimensions</Typography>
          <Typography variant="body2" paragraph>
            • <strong>Double-click dimensions:</strong> Edit room measurements<br/>
            • <strong>Orange lines:</strong> Show shared walls between rooms<br/>
            • <strong>Scale bar:</strong> Shows current measurement scale
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHelpDialog(false)} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scale Settings Dialog */}
      <Dialog open={showScaleDialog} onClose={() => setShowScaleDialog(false)}>
        <DialogTitle>Scale Settings</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Set what each grid square represents in real-world measurements.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              label="Grid Size"
              type="number"
              value={scaleSettings.pixelsPerUnit}
              onChange={(e) => setScaleSettings(prev => ({ ...prev, pixelsPerUnit: parseFloat(e.target.value) || 20 }))}
              sx={{ width: 100 }}
              inputProps={{ min: 1, max: 100, step: 1 }}
            />
            <Typography variant="body2">pixels =</Typography>
            <Typography variant="body2">1</Typography>
            <TextField
              select
              label="Unit"
              value={scaleSettings.unit}
              onChange={(e) => setScaleSettings(prev => ({ ...prev, unit: e.target.value }))}
              sx={{ width: 80 }}
            >
              <MenuItem value="ft">ft</MenuItem>
              <MenuItem value="in">in</MenuItem>
              <MenuItem value="m">m</MenuItem>
              <MenuItem value="cm">cm</MenuItem>
            </TextField>
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={scaleSettings.showDimensions}
                onChange={(e) => setScaleSettings(prev => ({ ...prev, showDimensions: e.target.checked }))}
              />
            }
            label="Show room dimensions"
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="textSecondary">
            Current: {scaleSettings.pixelsPerUnit} pixels = 1{scaleSettings.unit}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScaleDialog(false)}>Cancel</Button>
          <Button onClick={() => setShowScaleDialog(false)} variant="contained">Apply</Button>
        </DialogActions>
      </Dialog>

      {/* Dimension Input Dialog */}
      <Dialog open={editingDimension !== null} onClose={cancelDimensionEdit}>
        <DialogTitle>
          Edit {editingDimension?.edge === 'width' ? 'Width' : 'Height'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`New ${editingDimension?.edge === 'width' ? 'Width' : 'Height'}`}
            fullWidth
            value={dimensionInput}
            onChange={(e) => setDimensionInput(e.target.value)}
            onFocus={(e) => {
              // Select all text when the field gets focus
              e.target.select();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleDimensionSave();
              } else if (e.key === 'Escape') {
                cancelDimensionEdit();
              }
            }}
            inputProps={{
              onFocus: (e) => {
                // Also select all text when the input element gets focus
                setTimeout(() => e.target.select(), 0);
              }
            }}
            placeholder={`e.g., 12ft, 3.5m, 24in, or just 12 (${scaleSettings.unit})`}
            helperText={`Current: ${formatDimension(editingDimension?.value || 0)}. You can type in any unit (ft, in, m, cm) - it will be converted automatically.`}
          />
          {constraintPreview && (
            <Box sx={{
              mt: 2,
              p: 2,
              backgroundColor: darkMode ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0',
              borderRadius: 1,
              border: darkMode ? '1px solid rgba(255, 152, 0, 0.3)' : 'none'
            }}>
              <Typography variant="subtitle2" color="warning.main" gutterBottom>
                ⚠️ This dimension affects adjacent rooms
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: darkMode ? 'text.primary' : 'inherit' }}>
                Changing this will affect: {constraintPreview.adjacentRooms.map(a => a.room.name).join(', ')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => applyDimensionChange(constraintPreview.targetRoom, constraintPreview.edge, constraintPreview.newValue, 'resize-only')}
                >
                  Resize Only This Room
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => applyDimensionChange(constraintPreview.targetRoom, constraintPreview.edge, constraintPreview.newValue, 'push-pull')}
                >
                  Push/Pull Adjacent Rooms
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDimensionEdit}>Cancel</Button>
          <Button onClick={handleDimensionSave} variant="contained">
            {constraintPreview ? 'Choose Above' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })}>
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Circuit Manager Dialog removed for UI simplicity */}
    </Box>
  );
};

export default FloorPlanDrawer;
