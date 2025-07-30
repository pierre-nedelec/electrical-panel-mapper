import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Drawer,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Menu,
  Fab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OutletIcon from '@mui/icons-material/Power';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import PanToolIcon from '@mui/icons-material/PanTool';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalculateIcon from '@mui/icons-material/Calculate';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import config from '../config';
import deviceTypesService from '../services/deviceTypesService';
import useSvgTheming from '../hooks/useSvgTheming';

// Import electrical components
import ElectricalComponentLayer from './electrical/ElectricalComponentLayer';
import PanelVisualization from './electrical/PanelVisualization';
import ComponentPropertiesDialog from './electrical/ComponentPropertiesDialog';
import LoadAnalysisPanel from './electrical/LoadAnalysisPanel';
import { useComponentPlacement, ComponentPreview } from './electrical/ComponentPlacement';

const ComponentMapping = ({
  project,
  onComplete,
  onBackToPanels,
  darkMode = false
}) => {
  // Floor plan and room data
  const [rooms, setRooms] = useState([]);

  // Panel and circuit data from previous step
  const [panels, setPanels] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);

  // Component placement state
  const [electricalComponents, setElectricalComponents] = useState([]);
  const [selectedElectricalTool, setSelectedElectricalTool] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewBox, setViewBox] = useState("0 0 800 600");
  const [contextMenu, setContextMenu] = useState(null);

  // Component properties dialog
  const [propertiesDialog, setPropertiesDialog] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);

  // Edit mode toggle
  const [editMode, setEditMode] = useState(false);

  // Component dragging state
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Quick toolbar state
  const [showQuickToolbar, setShowQuickToolbar] = useState(true);

  // Load analysis is now embedded in the drawer

  // Circuit filtering state - now supports multiple circuit selection
  const [circuitFilter, setCircuitFilter] = useState(null); // null = show all, 'unassigned' = unassigned only, Set = multiple circuits
  const [selectedCircuits, setSelectedCircuits] = useState(new Set()); // Track multiple selected circuits
  
  // Circuit hover highlighting state
  const [hoveredCircuit, setHoveredCircuit] = useState(null); // Track which circuit is being hovered for highlighting

  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);

  // Apply SVG theming for dark mode
  useSvgTheming(svgRef, viewBox, darkMode);

  // Initialize component placement hook
  const {
    previewComponent,
    handleMouseMove: handleComponentMouseMove,
    handlePlacement: handleComponentPlacement,
    clearPreview
  } = useComponentPlacement(svgRef, true, 20, rooms);

  // Quick access tools for toolbar (component tools only)
  const quickTools = [
    // Component tools only
    { id: 'outlet', name: 'Outlet', icon: OutletIcon, shortcut: 'O', type: 'component', device_type_id: 2 },
    { id: 'light', name: 'Light', icon: LightbulbIcon, shortcut: 'L', type: 'component', device_type_id: 1 },
    { id: 'switch', name: 'Switch', icon: ToggleOnIcon, shortcut: 'S', type: 'component', device_type_id: 1 },
    { id: 'appliance', name: 'Appliance', icon: LocalFireDepartmentIcon, shortcut: 'A', type: 'component', device_type_id: 4 },
    { id: 'panel', name: 'Panel', icon: ElectricalServicesIcon, shortcut: 'P', type: 'component', device_type_id: 1 }
  ];

  // Canvas controls (zoom and history only - pan is now default behavior)
  const canvasControls = [
    { id: 'zoomIn', name: 'Zoom In', icon: ZoomInIcon, shortcut: '+', type: 'map' },
    { id: 'zoomOut', name: 'Zoom Out', icon: ZoomOutIcon, shortcut: '-', type: 'map' },
    { id: 'zoomReset', name: 'Reset View', icon: CenterFocusStrongIcon, shortcut: '0', type: 'map' },
    'divider',
    { id: 'undo', name: 'Undo', icon: UndoIcon, shortcut: 'Z', type: 'history' },
    { id: 'redo', name: 'Redo', icon: RedoIcon, shortcut: 'Y', type: 'history' }
  ];

  // Zoom functionality
  const updateViewBox = useCallback((zoom, offset) => {
    const baseWidth = 800;
    const baseHeight = 600;
    const width = baseWidth / zoom;
    const height = baseHeight / zoom;
    const x = -offset.x / zoom;
    const y = -offset.y / zoom;
    setViewBox(`${x} ${y} ${width} ${height}`);
  }, []);

  const handleZoom = useCallback((factor) => {
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * factor));
    setZoomLevel(newZoom);
    updateViewBox(newZoom, panOffset);
    // Reset pan point to prevent jumps on next pan
    setLastPanPoint({ x: 0, y: 0 });
  }, [zoomLevel, panOffset, updateViewBox]);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setViewBox("0 0 800 600");
    // Reset pan point to prevent jumps on next pan
    setLastPanPoint({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom handler
  const handleWheel = useCallback((event) => {
    event.preventDefault();

    // Zoom factor: smaller for more precise control
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));

    // Get mouse position relative to SVG
    const svgRect = svgRef.current.getBoundingClientRect();
    const mouseX = (event.clientX - svgRect.left) / svgRect.width;
    const mouseY = (event.clientY - svgRect.top) / svgRect.height;

    // Calculate new pan offset to zoom towards mouse position
    const currentViewBox = viewBox.split(' ').map(Number);
    const [vbX, vbY, vbW, vbH] = currentViewBox;

    // Mouse position in SVG coordinates
    const svgMouseX = vbX + mouseX * vbW;
    const svgMouseY = vbY + mouseY * vbH;

    // Calculate new viewBox dimensions
    const baseWidth = 800;
    const baseHeight = 600;
    const newVbW = baseWidth / newZoom;
    const newVbH = baseHeight / newZoom;

    // Adjust viewBox to keep mouse position stationary
    const newVbX = svgMouseX - mouseX * newVbW;
    const newVbY = svgMouseY - mouseY * newVbH;

    // Convert viewBox coordinates back to panOffset for consistency
    const newPanOffset = {
      x: -newVbX * newZoom,
      y: -newVbY * newZoom
    };

    setZoomLevel(newZoom);
    setPanOffset(newPanOffset);
    setViewBox(`${newVbX} ${newVbY} ${newVbW} ${newVbH}`);
    // Reset pan point to prevent jumps on next pan
    setLastPanPoint({ x: 0, y: 0 });
  }, [zoomLevel, viewBox]);

  // Handle non-component tool actions
  const handleToolAction = useCallback((tool) => {
    switch (tool.id) {
      case 'zoomIn':
        handleZoom(1.2);
        break;
      case 'zoomOut':
        handleZoom(0.8);
        break;
      case 'zoomReset':
        handleZoomReset();
        break;
      case 'undo':
        // TODO: Implement undo functionality
        console.log('Undo action');
        break;
      case 'redo':
        // TODO: Implement redo functionality
        console.log('Redo action');
        break;
      default:
        break;
    }
  }, [handleZoom, handleZoomReset]);

  // Handle tool selection with auto-close drawer
  const handleToolSelect = useCallback((tool) => {
    if (tool.type === 'component') {
      setSelectedElectricalTool(tool);
      setDrawerOpen(false); // Auto-close drawer when selecting a tool
    } else {
      // For non-component tools, handle them differently
      handleToolAction(tool);
    }
  }, [handleToolAction]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only respond to shortcuts when not typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

      const key = event.key.toUpperCase();
      let matchedTool = null;
      const allTools = [...quickTools, ...canvasControls];

      // Handle special keys
      if (key === '+' || key === '=') {
        matchedTool = allTools.find(t => t.id === 'zoomIn');
      } else if (key === '-' || key === '_') {
        matchedTool = allTools.find(t => t.id === 'zoomOut');
      } else if (key === '0') {
        matchedTool = allTools.find(t => t.id === 'zoomReset');
      } else if ((event.ctrlKey || event.metaKey) && key === 'Z') {
        event.preventDefault();
        if (event.shiftKey) {
          matchedTool = allTools.find(t => t.id === 'redo');
        } else {
          matchedTool = allTools.find(t => t.id === 'undo');
        }
      } else {
        // Normal shortcut keys
        matchedTool = allTools.find(t => t.shortcut === key);
      }

      if (matchedTool) {
        event.preventDefault();
        handleToolSelect(matchedTool);
      } else if (key === 'ESCAPE') {
        // Clear selected tool
        setSelectedElectricalTool(null);
        clearPreview();
      } else if (key === 'T') {
        // Toggle quick toolbar
        setShowQuickToolbar(!showQuickToolbar);
      } else if (key === 'U') {
        // Toggle unassigned filter
        setCircuitFilter(circuitFilter === 'unassigned' ? null : 'unassigned');
      } else if (key === 'C') {
        // Clear all filters
        setCircuitFilter(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [quickTools, canvasControls, showQuickToolbar, clearPreview, handleToolSelect]);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Load device types first (needed for component rendering)
      await deviceTypesService.fetchDeviceTypes();

      // Load floor plan data (rooms)
      const floorPlanResponse = await fetch(`${config.BACKEND_URL}/api/floor-plans/${project.id}`);
      if (floorPlanResponse.ok) {
        const floorPlan = await floorPlanResponse.json();
        setRooms(floorPlan.rooms || []);
        if (floorPlan.view_box) {
          setViewBox(floorPlan.view_box);
        }
      }

      // Load panels configured in previous step
      let panelsData = [];
      const panelsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/panels?floor_plan_id=${project.id}`);
      if (panelsResponse.ok) {
        panelsData = await panelsResponse.json();
        setPanels(Array.isArray(panelsData) ? panelsData : []);
        if (panelsData.length > 0) {
          setSelectedPanel(panelsData[0]);
        }
      }

      // Load circuits for all panels in this floor plan
      if (panelsData.length > 0) {
        const allCircuits = [];
        for (const panel of panelsData) {
          const circuitsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/circuits?panel_id=${panel.id}`);
          if (circuitsResponse.ok) {
            const circuitsData = await circuitsResponse.json();
            allCircuits.push(...(Array.isArray(circuitsData) ? circuitsData : []));
          }
        }
        setCircuits(allCircuits);
      }

      // Load existing electrical components
      const componentsResponse = await fetch(`${config.BACKEND_URL}/api/electrical/components?floor_plan_id=${project.id}`);
      if (componentsResponse.ok) {
        const componentsData = await componentsResponse.json();
        setElectricalComponents(Array.isArray(componentsData) ? componentsData : []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle electrical component placement
  const handleElectricalComponentPlaced = async (componentData) => {
    try {
      // Add to local state immediately
      const tempComponent = {
        ...componentData,
        id: `temp-${Date.now()}`,
      };
      setElectricalComponents(prev => [...prev, tempComponent]);

      // Save to backend
      const response = await fetch(`${config.BACKEND_URL}/api/electrical/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(componentData)
      });

      if (response.ok) {
        const savedComponent = await response.json();
        // Update with real ID from backend
        setElectricalComponents(prev =>
          prev.map(comp =>
            comp.id === tempComponent.id
              ? { ...savedComponent, ...componentData }
              : comp
          )
        );
        // Don't automatically clear the tool - keep it selected for multiple placements
        // User can press ESC or select another tool to change
        // setSelectedElectricalTool(null);
        clearPreview();
      } else {
        // Remove from local state if save failed
        setElectricalComponents(prev =>
          prev.filter(comp => comp.id !== tempComponent.id)
        );
        console.error('Failed to save component');
      }
    } catch (error) {
      console.error('Error placing electrical component:', error);
    }
  };

  // Handle SVG mouse events
  const handleSvgClick = (event) => {

    if (selectedElectricalTool && previewComponent) {
      handleComponentPlacement(event, selectedElectricalTool, handleElectricalComponentPlaced);
    } else {
      // Deselect components if clicking on empty space
      setSelectedComponent(null);
    }
  };

  // Pan handling
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const handleSvgMouseDown = (event) => {
    // Check if clicking on a draggable electrical component
    const isElectricalComponent = event.target.closest('.electrical-component') ||
                                  event.target.closest('.electrical-component-layer');

    // Allow panning everywhere except on electrical components when no tool is selected
    if (!isElectricalComponent && !selectedElectricalTool) {
      // Start panning
      setIsPanDragging(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  };

  const handleSvgMouseMoveForPan = (event) => {
    if (isDraggingComponent) {
      // Handle component dragging
      handleComponentDrag(event);
    } else if (isPanDragging) {
      // Calculate pan delta in screen coordinates
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;

      // Update pan offset and use existing viewBox update system
      const newOffset = {
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY
      };

      setPanOffset(newOffset);
      updateViewBox(zoomLevel, newOffset);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
    } else if (selectedElectricalTool) {
      // Show component preview when tool is selected
      handleComponentMouseMove(event, selectedElectricalTool);
    }
  };

  const handleSvgMouseUp = () => {
    if (isDraggingComponent) {
      handleComponentDragEnd();
    }
    if (isPanDragging) {
      setIsPanDragging(false);
      // Reset last pan point to prevent jumps on next pan start
      setLastPanPoint({ x: 0, y: 0 });
    }
  };

  const handleComponentSelect = (component) => {
    setSelectedComponent(component);
  };

  // Component drag handlers
  const handleComponentMouseDown = (event, component) => {
    if (!editMode) return; // Only allow dragging in edit mode

    event.stopPropagation();
    setSelectedComponent(component);
    setIsDraggingComponent(true);

    // Calculate offset from mouse to component center
    const svgRect = svgRef.current.getBoundingClientRect();
    const svgPoint = {
      x: (event.clientX - svgRect.left) / zoomLevel,
      y: (event.clientY - svgRect.top) / zoomLevel
    };

    setDragOffset({
      x: svgPoint.x - component.x,
      y: svgPoint.y - component.y
    });
  };

  const handleComponentDrag = (event) => {
    if (!isDraggingComponent || !selectedComponent || !editMode) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const svgPoint = {
      x: (event.clientX - svgRect.left) / zoomLevel,
      y: (event.clientY - svgRect.top) / zoomLevel
    };

    const newPosition = {
      x: svgPoint.x - dragOffset.x,
      y: svgPoint.y - dragOffset.y
    };

    // Update component position in local state
    setElectricalComponents(prev =>
      prev.map(comp =>
        comp.id === selectedComponent.id
          ? { ...comp, x: newPosition.x, y: newPosition.y }
          : comp
      )
    );

    // Update selected component
    setSelectedComponent(prev => ({
      ...prev,
      x: newPosition.x,
      y: newPosition.y
    }));
  };

  const handleComponentDragEnd = async () => {
    if (!isDraggingComponent || !selectedComponent) return;

    setIsDraggingComponent(false);

    // Save new position to backend
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/electrical/components/${selectedComponent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedComponent)
      });

      if (!response.ok) {
        console.error('Failed to save component position');
      }
    } catch (error) {
      console.error('Error saving component position:', error);
    }
  };

  const handleComponentDoubleClick = (component) => {
    setSelectedComponent(component);
    setEditingComponent(component);
    setPropertiesDialog(true);
  };

  // Context menu handlers
  const handleComponentRightClick = (event, component) => {
    event.preventDefault();
    setSelectedComponent(component);
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      type: 'component',
      component
    });
  };

  const handleMapRightClick = (event) => {
    if (event.target.tagName === 'svg' || event.target.tagName === 'rect') {
      event.preventDefault();
      setContextMenu({
        mouseX: event.clientX,
        mouseY: event.clientY,
        type: 'map'
      });
    }
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleDeleteComponent = async (component) => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/entities/${component.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setElectricalComponents(prev => prev.filter(c => c.id !== component.id));
        setSelectedComponent(null);
      }
    } catch (error) {
      console.error('Failed to delete component:', error);
    }
    handleContextMenuClose();
  };

  const handleEditComponent = (component) => {
    setSelectedComponent(component);
    setEditingComponent(component);
    setPropertiesDialog(true);
    handleContextMenuClose();
  };

  // Circuit filtering helper functions
  const toggleCircuitFilter = (circuitId) => {
    if (circuitId === 'unassigned') {
      if (circuitFilter === 'unassigned') {
        // If unassigned is currently selected, clear all
        setCircuitFilter(null);
        setSelectedCircuits(new Set());
      } else {
        // Select unassigned only
        setCircuitFilter('unassigned');
        setSelectedCircuits(new Set());
      }
      return;
    }

    // Handle multi-select for specific circuits
    const newSelectedCircuits = new Set(selectedCircuits);
    
    if (newSelectedCircuits.has(circuitId)) {
      // Remove circuit from selection
      newSelectedCircuits.delete(circuitId);
    } else {
      // Add circuit to selection
      newSelectedCircuits.add(circuitId);
    }

    if (newSelectedCircuits.size === 0) {
      setCircuitFilter(null);
      setSelectedCircuits(new Set());
    } else {
      setCircuitFilter('multi');
      setSelectedCircuits(newSelectedCircuits);
    }
  };

  const clearAllFilters = () => {
    setCircuitFilter(null);
    setSelectedCircuits(new Set());
  };

  const isCircuitSelected = (circuitId) => {
    if (circuitFilter === 'unassigned' && circuitId === 'unassigned') return true;
    if (circuitFilter === 'multi') return selectedCircuits.has(circuitId);
    return false;
  };

  // Filter components based on current selection
  const getFilteredComponents = () => {
    if (circuitFilter === null) {
      return electricalComponents; // Show all
    }
    if (circuitFilter === 'unassigned') {
      return electricalComponents.filter(c => !c.circuit_id);
    }
    if (circuitFilter === 'multi') {
      return electricalComponents.filter(c => 
        selectedCircuits.has(c.circuit_id) || 
        (selectedCircuits.has('unassigned') && !c.circuit_id)
      );
    }
    return electricalComponents;
  };

  // Handle component property saves
  const handleComponentSave = async (updatedComponent) => {
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/electrical/components/${updatedComponent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedComponent)
      });

      if (response.ok) {
        const savedComponent = await response.json();
        // Update component in local state
        setElectricalComponents(prev =>
          prev.map(comp =>
            comp.id === updatedComponent.id ? { ...savedComponent, ...updatedComponent } : comp
          )
        );
        // Update selected component if it's the one being edited
        if (selectedComponent?.id === updatedComponent.id) {
          setSelectedComponent({ ...selectedComponent, ...updatedComponent });
        }
      } else {
        console.error('Failed to save component');
      }
    } catch (error) {
      console.error('Error saving component:', error);
    }
  };

  // Get the room that contains a given component
  const getComponentRoom = (component) => {
    if (!component || !rooms) return null;
    
    return rooms.find(room => {
      return component.x >= room.x &&
             component.x <= room.x + room.width &&
             component.y >= room.y &&
             component.y <= room.y + room.height;
    });
  };

  // Get completion status (simplified - no circuit assignments)
  const getCompletionStatus = () => {
    return {
      totalComponents: electricalComponents.length,
      assignedComponents: electricalComponents.length, // All components are considered "placed"
      unassignedComponents: 0,
      completionPercentage: electricalComponents.length > 0 ? 100 : 0,
      canProceed: electricalComponents.length > 0
    };
  };

  const status = getCompletionStatus();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography>Loading component mapping...</Typography>
      </Container>
    );
  }

  const drawerContent = (
    <Box sx={{ width: 450, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Analysis & Tools</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Load Analysis Section - Always Visible */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CalculateIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Load Analysis</Typography>
          </Box>

          {/* Embed LoadAnalysisPanel content directly */}
          <LoadAnalysisPanel
            rooms={rooms}
            components={electricalComponents}
            circuits={circuits}
            panels={panels}
            open={true}
            embedded={true}
          />
        </Box>

        {/* Component Tools Section */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" gutterBottom>
            Component Tools
          </Typography>

          {rooms.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No rooms found. Please go back and create floor plan rooms first.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Component tools are available in the Quick Toolbar on the left. Use this panel for component overview and panel information.
              </Typography>

              {selectedElectricalTool && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Click on the floor plan to place {selectedElectricalTool.name}
                </Alert>
              )}

              {!selectedElectricalTool && electricalComponents.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Double-click any component on the map to edit its properties
                </Alert>
              )}

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Electrical Panels:
                </Typography>

                {panels.length === 0 ? (
                  <Alert severity="warning">
                    No panels configured. Please go back to Panel Setup.
                  </Alert>
                ) : (
                  <List dense>
                    {panels.map(panel => (
                        <ListItem key={panel.id} divider>
                          <ListItemText
                            primary={panel.panel_name}
                          secondary={`Panel placed at (${Math.round(panel.x_position)}, ${Math.round(panel.y_position)})`}
                          />
                        </ListItem>
                    ))}</List>
                )}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Component Summary:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${status.totalComponents} Components`}
                    color="primary"
                    size="small"
                  />
                  <Chip
                    label={`${panels.length} Panels`}
                    color="secondary"
                    size="small"
                  />
                </Box>
              </Box>

              {/* Help Section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Quick Help:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    • Use toolbar (left) to select components
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    • Click map to place selected component
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    • Double-click component to edit properties
                  </Typography>
                                <Typography variant="caption" color="textSecondary">
                • Drag to pan, mouse wheel or controls to zoom
              </Typography>
                                <Typography variant="caption" color="textSecondary">
                • Shortcuts: O=Outlet, L=Light, S=Switch
              </Typography>
              <Typography variant="caption" color="textSecondary">
                • Circuit filters: U=Unassigned, C=Clear filters
              </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Full-page SVG Editor */}
      <Box
        sx={{
          position: 'relative',
          flexGrow: 1,
          overflow: 'hidden',
          backgroundColor: darkMode ? '#2c2c2c' : '#f5f5f5'
        }}
      >
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox={viewBox}
                  style={{
                    cursor: isPanDragging ? 'grabbing'
                           : selectedElectricalTool ? 'crosshair'
                           : 'grab'
                  }}
                  onMouseMove={handleSvgMouseMoveForPan}
                  onMouseDown={handleSvgMouseDown}
                  onMouseUp={handleSvgMouseUp}
                  onClick={handleSvgClick}
                  onContextMenu={handleMapRightClick}
                  onWheel={handleWheel}
                >
                  {/* Grid pattern */}
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke={darkMode ? "#444444" : "#e0e0e0"} strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#grid)" />

                  {/* Rooms */}
                  <g className="rooms-layer">
                    {rooms.map(room => (
                      <g key={room.id}>
                        <rect
                          x={room.x}
                          y={room.y}
                          width={room.width}
                          height={room.height}
                          fill={darkMode ? "rgba(144, 202, 249, 0.2)" : "rgba(144, 202, 249, 0.1)"}
                          stroke={darkMode ? "#90caf9" : "#1976d2"}
                          strokeWidth="2"
                        />
                        <text
                          x={room.x + room.width / 2}
                          y={room.y + room.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="12"
                          fill={darkMode ? "#90caf9" : "#1976d2"}
                          fontWeight="500"
                          style={{
                            pointerEvents: 'none',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none'
                          }}
                        >
                          {room.name || 'Room'}
                        </text>
                      </g>
                    ))}
                  </g>

                  {/* Electrical Components */}
                  <ElectricalComponentLayer
                    components={getFilteredComponents()}
                    selectedComponent={selectedComponent}
                    onComponentSelect={handleComponentSelect}
                    onComponentDoubleClick={handleComponentDoubleClick}
                    onComponentRightClick={handleComponentRightClick}
                    onComponentMouseDown={handleComponentMouseDown}
                    editMode={editMode}
                    visible={true}
                    circuits={circuits}
                    circuitFilter={circuitFilter}
                    selectedCircuits={selectedCircuits}
                    hoveredCircuit={hoveredCircuit}
                  />

                  {/* Electrical Panels */}
                  {panels.map(panel => (
                    <PanelVisualization
                      key={panel.id}
                      panel={panel}
                      circuits={[]}
                      selected={selectedPanel?.id === panel.id}
                      onSelect={() => setSelectedPanel(panel)}
                    />
                  ))}

                  {/* Component Preview */}
                  <ComponentPreview previewComponent={previewComponent} />
                </svg>

                {/* Floating Tools Button */}
                <Tooltip
                  title={
                    selectedElectricalTool
                      ? `${selectedElectricalTool.name} Tool Active - More Tools`
                      : "Open Tool Menu (or use Quick Toolbar on left)"
                  }
                  placement="left"
                >
                  <Fab
                    color={selectedElectricalTool ? "secondary" : "primary"}
                    aria-label="tools"
                    onClick={() => setDrawerOpen(true)}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                    }}
                  >
                    <MenuIcon />
                  </Fab>
                </Tooltip>

                {/* Component Toolbar */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  {/* Component Tools */}
                  <Box sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                    p: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 0.5
                  }}>
                    {quickTools.map((tool) => {
                      const IconComponent = tool.icon;
                      const isActive = selectedElectricalTool?.id === tool.id;

                      return (
                        <Tooltip
                          key={tool.id}
                          title={`${tool.name} (${tool.shortcut})`}
                          placement="right"
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleToolSelect(tool)}
                            sx={{
                              backgroundColor: isActive ? 'primary.main' : 'transparent',
                              color: isActive ? 'primary.contrastText' : 'text.secondary',
                              borderRadius: 1,
                              width: 32,
                              height: 32,
                              border: isActive ? 'none' : '1px solid transparent',
                              '&:hover': {
                                backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                                border: isActive ? 'none' : '1px solid',
                                borderColor: isActive ? 'transparent' : 'divider'
                              }
                            }}
                          >
                            <IconComponent fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>

                {/* Circuit Filter Panel - Compact Design */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 70, // Next to canvas controls
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <Box sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                    p: 1,
                    maxWidth: 280,
                    maxHeight: 200
                  }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                      Circuit Filter
                    </Typography>

                    {/* Main filter buttons */}
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <Chip
                        label={`All (${electricalComponents.length})`}
                        size="small"
                        variant={circuitFilter === null ? "filled" : "outlined"}
                        color={circuitFilter === null ? "primary" : "default"}
                        onClick={clearAllFilters}
                        clickable
                        sx={{ fontSize: '10px' }}
                      />

                      <Chip
                        label={`Unassigned (${electricalComponents.filter(c => !c.circuit_id).length})`}
                        size="small"
                        variant={isCircuitSelected('unassigned') ? "filled" : "outlined"}
                        color={isCircuitSelected('unassigned') ? "warning" : "default"}
                        onClick={() => toggleCircuitFilter('unassigned')}
                        onMouseEnter={() => setHoveredCircuit('unassigned')}
                        onMouseLeave={() => setHoveredCircuit(null)}
                        clickable
                        sx={{ fontSize: '10px' }}
                      />
                      
                      {/* Multi-select indicator */}
                      {circuitFilter === 'multi' && selectedCircuits.size > 1 && (
                        <Chip
                          label={`${selectedCircuits.size} Selected`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          onClick={clearAllFilters}
                          onDelete={clearAllFilters}
                          sx={{ fontSize: '10px' }}
                        />
                      )}
                    </Box>

                    {/* Circuit chips in a scrollable container */}
                    {circuits.filter(c => electricalComponents.some(comp => comp.circuit_id === c.id)).length > 0 && (
                      <Box sx={{
                        maxHeight: 120,
                        overflow: 'auto',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        '&::-webkit-scrollbar': {
                          width: '4px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: darkMode ? '#424242' : '#f1f1f1',
                          borderRadius: '2px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: darkMode ? '#757575' : '#c1c1c1',
                          borderRadius: '2px',
                        },
                      }}>
                        {circuits.map(circuit => {
                          const componentCount = electricalComponents.filter(c => c.circuit_id === circuit.id).length;
                          if (componentCount === 0) return null;

                          const circuitColors = [
                            '#FF5722', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0',
                            '#607D8B', '#795548', '#F44336', '#3F51B5', '#009688',
                            '#FFC107', '#E91E63'
                          ];

                          const getCircuitColor = (circuit) => {
                            if (circuit?.color_code) return circuit.color_code;
                            if (circuit?.breaker_position) {
                              const colorIndex = (circuit.breaker_position - 1) % circuitColors.length;
                              return circuitColors[colorIndex];
                            }
                            return '#666666';
                          };

                          const circuitColor = getCircuitColor(circuit);
                          const isActive = isCircuitSelected(circuit.id);

                          return (
                            <Chip
                              key={circuit.id}
                              label={`${circuit.breaker_position} (${componentCount})`}
                              size="small"
                              variant={isActive ? "filled" : "outlined"}
                              onClick={() => toggleCircuitFilter(circuit.id)}
                              onMouseEnter={() => setHoveredCircuit(circuit.id)}
                              onMouseLeave={() => setHoveredCircuit(null)}
                              clickable
                              sx={{
                                fontSize: '10px',
                                backgroundColor: isActive ? circuitColor : 'transparent',
                                borderColor: circuitColor,
                                color: isActive ? 'white' : circuitColor,
                                '&:hover': {
                                  backgroundColor: circuitColor,
                                  color: 'white'
                                },
                                '& .MuiChip-icon': {
                                  color: 'inherit'
                                }
                              }}
                              icon={
                                <Box sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  backgroundColor: isActive ? 'white' : circuitColor
                                }} />
                              }
                            />
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Canvas Controls */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  {/* All Canvas Controls in one unified panel */}
                  <Box sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    {canvasControls.map((tool, index) => {
                      if (tool === 'divider') {
                        return <Box key={index} sx={{ height: '1px', backgroundColor: 'divider', mx: 0.5 }} />;
                      }

                      const IconComponent = tool.icon;
                      const isActive = false;

                      return (
                        <Tooltip
                          key={tool.id}
                          title={`${tool.name} (${tool.shortcut})`}
                          placement="right"
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleToolAction(tool)}
                            sx={{
                              borderRadius: 0,
                              width: 32,
                              height: 32,
                              backgroundColor: isActive ? 'primary.main' : 'transparent',
                              color: isActive ? 'primary.contrastText' : 'text.secondary',
                              '&:hover': {
                                backgroundColor: isActive ? 'primary.dark' : 'action.hover'
                              }
                            }}
                          >
                            <IconComponent fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      );
                    })}
                  </Box>

                  {/* Zoom Level Indicator */}
                  <Box
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '12px',
                      textAlign: 'center',
                      width: 32, // Match button width
                      boxSizing: 'border-box'
                    }}
                  >
                    {Math.round(zoomLevel * 100)}%
                  </Box>
                </Box>

                {/* Status Bar */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    maxWidth: '80%',
                    zIndex: 1100
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {status.totalComponents} components placed • {panels.length} panels configured
                  </Typography>
                  {editMode && (
                    <>
                      <Box sx={{ width: '1px', height: '16px', bgcolor: 'rgba(255,255,255,0.3)' }} />
                      <Typography variant="body2" sx={{ color: 'orange' }}>
                        🔧 Edit Mode: Click and drag components
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Floating Action Buttons */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <Tooltip title="Save Project">
                    <Fab
                      size="small"
                      color="primary"
                      onClick={onComplete}
                      disabled={!status.canProceed}
                    >
                      <ArrowForwardIcon />
                    </Fab>
                  </Tooltip>

                  <Tooltip title={editMode ? "Lock Components" : "Edit Components"}>
                    <Fab
                      size="small"
                      color={editMode ? "secondary" : "default"}
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? <EditIcon /> : <VisibilityIcon />}
                    </Fab>
                  </Tooltip>
                </Box>
              </Box>

      {/* Side Drawer with Tools */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>

      {/* Component Properties Dialog */}
      <ComponentPropertiesDialog
        open={propertiesDialog}
        onClose={() => {
          setPropertiesDialog(false);
          setEditingComponent(null);
        }}
        onSave={handleComponentSave}
        component={editingComponent}
        rooms={rooms}
        circuits={circuits}
        components={electricalComponents}
        getComponentRoom={getComponentRoom}
      />

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {contextMenu?.type === 'component' && [
          <MenuItem key="edit" onClick={() => handleEditComponent(contextMenu.component)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Component
          </MenuItem>,
          <MenuItem key="delete" onClick={() => handleDeleteComponent(contextMenu.component)}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Component
          </MenuItem>
        ]}

        {contextMenu?.type === 'map' && [
          <MenuItem key="paste" onClick={handleContextMenuClose} disabled>
            Paste Component
          </MenuItem>
        ]}
      </Menu>

    </Box>
  );
};

export default ComponentMapping;