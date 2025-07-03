# Integration Plan: Existing Electrical Components → Unified System

## CURRENT COMPONENT ANALYSIS

### Existing Electrical Components (Strengths)
1. **BreakerPanel.js**: Robust breaker management with CRUD operations
2. **EntitiesPanel.js**: Entity listing and room assignment capabilities  
3. **EntityDetailsDialog.js**: Property editing for electrical components
4. **MapEditor.js**: Visual entity placement on SVG floor plans
5. **EntitySelector.js**: Component type selection with icons

### Current Architecture (Separate Systems)
```
Current Flow:
Floor Plan Creation (FloorPlanDrawer) 
     ↓ (separate)
Electrical Component Placement (MapEditor)
     ↓ (separate) 
Component Management (EntitiesPanel)
     ↓ (separate)
Breaker Management (BreakerPanel)
```

### Integration Target (Unified System)
```
Target Flow:
Floor Plan Creation + Electrical Placement (Enhanced FloorPlanDrawer)
     ↓ (integrated)
Real-time Circuit Visualization
     ↓ (integrated)
Unified Component + Breaker Management
```

## INTEGRATION STRATEGY

### Phase 1A: Foundation Migration (Week 1-2)
**Goal**: Merge existing electrical functionality into FloorPlanDrawer

#### 1.1 Extract Reusable Logic
**From EntitySelector.js:**
```javascript
// Extract to: src/components/electrical/ElectricalSymbolPalette.js
const ElectricalSymbolPalette = ({ onComponentSelect, selectedTool }) => {
  // Migrate symbol selection logic
  // Enhance with standard electrical symbols
  // Add to FloorPlanDrawer toolbar
};
```

**From MapEditor.js:**
```javascript
// Extract to: src/components/electrical/ComponentPlacement.js
const ComponentPlacement = ({ 
  svgRef, 
  entityToAdd, 
  onComponentPlaced,
  snapToGrid 
}) => {
  // Migrate placement logic
  // Enhance with room boundary snapping
  // Integrate with FloorPlanDrawer mouse handling
};
```

#### 1.2 Data Model Unification
**Current Issue**: Separate data storage for rooms and electrical entities
```javascript
// Current: Separate API calls
fetch('/rooms') → rooms[]
fetch('/entities') → entities[]
fetch('/breakers') → breakers[]
```

**Target Solution**: Unified floor plan model
```javascript
// Target: Single comprehensive model
fetch('/floor-plans/123/complete') → {
  rooms: [...],
  electrical: {
    components: [...],
    panels: [...],
    circuits: [...]
  }
}
```

### Phase 1B: Component Integration (Week 3-4)
**Goal**: Integrate electrical component placement directly into floor plan editor

#### 1.3 Enhanced FloorPlanDrawer
**Modifications to src/components/FloorPlanDrawer.js:**

```javascript
// Add electrical mode state
const [electricalMode, setElectricalMode] = useState(false);
const [selectedElectricalTool, setSelectedElectricalTool] = useState(null);
const [electricalComponents, setElectricalComponents] = useState([]);

// Enhanced toolbar with electrical tools
const renderToolbar = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {/* Existing room tools */}
    <ToolbarSection title="Drawing" visible={!electricalMode}>
      <Button onClick={() => setMode('draw')}>Add Room</Button>
      {/* ... existing room tools */}
    </ToolbarSection>
    
    {/* New electrical tools */}
    <ToolbarSection title="Electrical" visible={electricalMode}>
      <ElectricalSymbolPalette 
        onSelect={setSelectedElectricalTool}
        selected={selectedElectricalTool}
      />
    </ToolbarSection>
    
    {/* Mode toggle */}
    <ToggleButton
      value={electricalMode}
      onChange={setElectricalMode}
    >
      {electricalMode ? 'Room Mode' : 'Electrical Mode'}
    </ToggleButton>
  </Box>
);

// Enhanced mouse handling for electrical placement
const handleMouseDown = useCallback((event) => {
  if (electricalMode && selectedElectricalTool) {
    handleElectricalComponentPlacement(event);
  } else {
    // Existing room handling
    handleRoomMouseDown(event);
  }
}, [electricalMode, selectedElectricalTool]);
```

#### 1.4 Visual Layer System
**Implementation in FloorPlanDrawer SVG:**

```javascript
<svg ref={svgRef} {...}>
  {/* Existing grid and rooms */}
  <defs>
    <pattern id="grid" {...}>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
  
  {/* Room layer */}
  <g id="rooms-layer">
    {rooms.map(room => (
      <RoomComponent key={room.id} room={room} />
    ))}
  </g>
  
  {/* NEW: Electrical component layer */}
  <g id="electrical-layer" style={{display: showElectrical ? 'block' : 'none'}}>
    {electricalComponents.map(component => (
      <ElectricalComponent 
        key={component.id} 
        component={component}
        onSelect={setSelectedComponent}
        selected={selectedComponent?.id === component.id}
      />
    ))}
  </g>
  
  {/* NEW: Circuit visualization layer */}
  <g id="circuits-layer" style={{display: showCircuits ? 'block' : 'none'}}>
    {circuits.map(circuit => (
      <CircuitPath
        key={circuit.id}
        circuit={circuit}
        components={getCircuitComponents(circuit)}
        panel={getCircuitPanel(circuit)}
      />
    ))}
  </g>
</svg>
```

### Phase 1C: Circuit Visualization (Week 5-6)
**Goal**: Add visual circuit connections between components and panels

#### 1.5 Circuit Path Rendering
**New Component: src/components/electrical/CircuitPath.js**

```javascript
const CircuitPath = ({ circuit, components, panel }) => {
  const pathData = useMemo(() => {
    // Calculate optimal path from panel to each component
    // Avoid routing through rooms when possible
    // Use Manhattan routing with obstacle avoidance
    return calculateCircuitPath(panel.position, components, rooms);
  }, [circuit, components, panel, rooms]);
  
  return (
    <g className="circuit-path" data-circuit-id={circuit.id}>
      <path
        d={pathData}
        stroke={circuit.color}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
        onClick={() => onCircuitSelect(circuit)}
      />
      <text x={pathData.labelX} y={pathData.labelY}>
        {circuit.label}
      </text>
    </g>
  );
};
```

#### 1.6 Panel Integration
**Migrate BreakerPanel.js logic into visual panel representation:**

```javascript
// New Component: src/components/electrical/PanelVisualization.js
const PanelVisualization = ({ panel, circuits, position }) => {
  return (
    <g className="electrical-panel" transform={`translate(${position.x}, ${position.y})`}>
      {/* Panel outline */}
      <rect width="100" height="200" fill="white" stroke="black" strokeWidth="2"/>
      
      {/* Main breaker */}
      <rect x="10" y="10" width="80" height="30" fill="gray"/>
      <text x="50" y="28" textAnchor="middle">Main {panel.mainAmps}A</text>
      
      {/* Breaker positions */}
      {panel.positions.map((position, index) => (
        <BreakerPosition 
          key={index}
          position={position}
          circuit={getCircuitForPosition(circuits, position)}
          y={50 + index * 15}
        />
      ))}
    </g>
  );
};
```

## TECHNICAL MIGRATION PLAN

### Step 1: Data Migration (Days 1-3)
**Unify database schemas:**

```sql
-- Modify existing entities table to work with floor plans
ALTER TABLE entities ADD COLUMN floor_plan_id INTEGER REFERENCES floor_plans(id);
UPDATE entities SET floor_plan_id = (SELECT id FROM floor_plans LIMIT 1); -- temporary migration

-- Create circuit relationships
CREATE TABLE IF NOT EXISTS electrical_circuits (
    id SERIAL PRIMARY KEY,
    floor_plan_id INTEGER REFERENCES floor_plans(id),
    name VARCHAR(100),
    breaker_position INTEGER,
    amperage INTEGER,
    color_code VARCHAR(7) DEFAULT '#000000'
);

-- Link entities to circuits
ALTER TABLE entities ADD COLUMN circuit_id INTEGER REFERENCES electrical_circuits(id);
```

### Step 2: Component Extraction (Days 4-6)
**Extract reusable logic from existing components:**

```javascript
// From EntitySelector.js → ElectricalSymbolPalette.js
export const electricalSymbols = {
  outlet: { icon: OutletIcon, label: 'Outlet' },
  light: { icon: LightbulbIcon, label: 'Light' },
  switch: { icon: ToggleOnIcon, label: 'Switch' },
  panel: { icon: ElectricalServicesIcon, label: 'Panel' }
};

// From MapEditor.js → ComponentPlacement.js
export const handleComponentPlacement = (svgRef, position, componentType) => {
  // Extract placement logic
  // Add room boundary detection
  // Add grid snapping
};
```

### Step 3: FloorPlanDrawer Enhancement (Days 7-10)
**Modify FloorPlanDrawer.js to include electrical functionality:**

```javascript
// Add to imports
import { ElectricalSymbolPalette } from './electrical/ElectricalSymbolPalette';
import { ComponentPlacement } from './electrical/ComponentPlacement';
import { CircuitVisualization } from './electrical/CircuitVisualization';

// Add to state management
const [electricalData, setElectricalData] = useState({
  components: [],
  circuits: [],
  panels: []
});

// Integrate with existing save/load
const saveFloorPlanWithElectrical = async () => {
  const planData = {
    ...existingPlanData,
    electrical: electricalData
  };
  await saveFloorPlanToServer(planData);
};
```

### Step 4: UI Integration (Days 11-14)
**Seamless mode switching and tool integration:**

```javascript
// Enhanced toolbar with mode switching
const Toolbar = () => (
  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
    <Tabs value={currentMode} onChange={handleModeChange}>
      <Tab label="Rooms" value="rooms" />
      <Tab label="Electrical" value="electrical" />
      <Tab label="Circuits" value="circuits" />
    </Tabs>
    
    <TabPanel value="rooms">
      {/* Existing room tools */}
    </TabPanel>
    
    <TabPanel value="electrical">
      <ElectricalSymbolPalette onSelect={setSelectedTool} />
    </TabPanel>
    
    <TabPanel value="circuits">
      <CircuitManager circuits={circuits} onUpdate={setCircuits} />
    </TabPanel>
  </Box>
);
```

## BACKWARD COMPATIBILITY

### Existing Data Preservation
**Ensure existing floor plans and electrical data remain accessible:**

```javascript
// Migration utility
const migrateExistingData = async () => {
  // Migrate standalone entities to floor-plan-linked entities
  const orphanedEntities = await fetch('/entities?floor_plan_id=null');
  
  // Create default circuits for existing entities
  const defaultCircuits = groupEntitiesByRoom(orphanedEntities);
  
  // Preserve existing breaker assignments
  await Promise.all(existingBreakers.map(migrateBreaker));
};
```

### API Compatibility
**Maintain existing API endpoints during transition:**

```javascript
// Keep existing endpoints working
app.get('/entities', handleEntitiesRequest); // Still works
app.get('/breakers', handleBreakersRequest); // Still works

// Add new unified endpoints
app.get('/floor-plans/:id/electrical', handleElectricalRequest);
app.post('/floor-plans/:id/electrical/components', handleComponentCreate);
```

## TESTING STRATEGY

### Integration Testing Checklist
- [ ] Existing floor plans load correctly
- [ ] Room creation still works in unified editor
- [ ] Electrical component placement functions
- [ ] Circuit visualization renders correctly
- [ ] Data saves/loads preserve both rooms and electrical info
- [ ] Mode switching works smoothly
- [ ] Performance remains acceptable

### User Acceptance Testing
- [ ] Existing users can continue their workflow
- [ ] New electrical features are discoverable
- [ ] Circuit visualization is clear and helpful
- [ ] Overall experience feels integrated, not bolted-on

## ROLLBACK PLAN

### If Integration Issues Arise
1. **Immediate Rollback**: Restore separate systems functionality
2. **Data Safety**: Ensure no data loss during migration
3. **User Communication**: Clear notification of any temporary limitations
4. **Rapid Recovery**: Ability to switch back to previous architecture within 1 hour

### Risk Mitigation
- Feature flags for electrical mode
- Database transaction safety
- Comprehensive automated testing
- User feedback monitoring

This integration plan ensures that the powerful existing electrical components are seamlessly merged with the floor plan system while maintaining all current functionality and adding significant new value through unified workflow and visual circuit representation.
