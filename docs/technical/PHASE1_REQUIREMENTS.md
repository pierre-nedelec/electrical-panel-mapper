# Phase 1 Technical Requirements - Unified Electrical Floor Plan System

## OVERVIEW
Phase 1 transforms the current separate floor plan and electrical component systems into a unified workflow where users can create floor plans and immediately place electrical components with visual circuit connections.

## FEATURE REQUIREMENTS

### 1. ENHANCED FLOOR PLAN EDITOR

#### 1.1 Electrical Component Placement Mode
**Requirements:**
- Add "Electrical Mode" toggle to FloorPlanDrawer toolbar
- When enabled, show electrical component selector (lights, outlets, switches, etc.)
- Component placement should snap to room boundaries and grid
- Support for component rotation (0°, 90°, 180°, 270°)
- Visual preview of component before placement
- Undo/redo support for electrical component operations

**Acceptance Criteria:**
```
✓ User can toggle between "Room Drawing" and "Electrical Placement" modes
✓ Component selector shows standard electrical symbols
✓ Components snap to room edges and corners when appropriate
✓ Preview component follows mouse cursor before placement
✓ Component placement is tracked in undo/redo history
✓ Components can be selected, moved, rotated, and deleted
```

#### 1.2 Electrical Symbol Library
**Requirements:**
- Standard electrical symbols: outlets, lights, switches, panels, junction boxes
- Symbols follow IEEE/NFPA standards where applicable
- Customizable symbol sizes (small, medium, large)
- Symbol properties: voltage rating, amperage, special features (GFCI, dimmer, etc.)
- Symbol color coding for different circuits

**Technical Specifications:**
```javascript
// Symbol definition structure
const electricalSymbol = {
  id: 'duplex_outlet',
  name: 'Duplex Outlet',
  category: 'outlets',
  svg: '<path d="M..."/>',  // SVG path for symbol
  defaultSize: { width: 20, height: 20 },
  properties: {
    voltage: { type: 'select', options: [120, 240], default: 120 },
    amperage: { type: 'number', min: 15, max: 50, default: 20 },
    gfci: { type: 'boolean', default: false },
    dedicated: { type: 'boolean', default: false }
  },
  snapPoints: [
    { x: 0, y: 0, type: 'connection' },
    { x: 10, y: 0, type: 'wire_entry' }
  ]
};
```

### 2. CIRCUIT VISUALIZATION SYSTEM

#### 2.1 Visual Circuit Connections
**Requirements:**
- Draw lines connecting electrical components to panel breakers
- Color-coded circuits (up to 12 distinct colors for standard panels)
- Circuit lines should route around obstacles (rooms, other components)
- Show/hide circuit toggle for clean drawing views
- Circuit line properties: wire gauge, circuit number, load

**Technical Implementation:**
```javascript
// Circuit line rendering
const CircuitLine = ({ start, end, circuit, visible }) => {
  const path = calculatePath(start, end, obstacles);
  return (
    <path
      d={path}
      stroke={circuit.color}
      strokeWidth="2"
      strokeDasharray={circuit.type === 'dedicated' ? '5,5' : 'none'}
      visibility={visible ? 'visible' : 'hidden'}
      onClick={() => openCircuitDetails(circuit)}
    />
  );
};
```

#### 2.2 Panel Representation
**Requirements:**
- Visual electrical panel with numbered breaker positions
- Support for common panel sizes (12, 16, 20, 24, 30, 40 position)
- Breaker visualization: single-pole, double-pole, GFCI, AFCI
- Panel placement on floor plan with connection points
- Panel schedule sidebar showing breaker assignments

**Panel Layout:**
```
┌─────────────────┐
│ Main: 200A      │
├─────────────────┤
│ 1│15A │Kitchen  │
│ 2│20A │Outlets  │
│ 3│15A │Bedroom  │
│ 4│20A │Bath     │
│ 5│    │Spare    │
│ 6│    │Spare    │
└─────────────────┘
```

### 3. INTEGRATED WORKFLOW

#### 3.1 Unified Editor Interface
**Requirements:**
- Single editor that handles both rooms and electrical components
- Context-sensitive toolbars (room tools vs electrical tools)
- Layer system: Background, Rooms, Electrical, Annotations
- Properties panel showing details of selected item (room or component)
- Search/filter functionality for finding components

**UI Layout:**
```
┌──────────────────────────────────────────────────────┐
│ File | Edit | View | Tools | Help                    │
├─────────┬────────────────────────────────┬───────────┤
│ Mode:   │                                │ Properties│
│ ○ Rooms │        Floor Plan Canvas       │ ┌─────────┐│
│ ● Elec  │                                │ │Selected:││
│ Tools:  │                                │ │ Outlet  ││
│ [Add]   │                                │ │ 120V    ││
│ [Move]  │                                │ │ 20A     ││
│ [Wire]  │                                │ │ GFCI: ☑ ││
│ Layers: │                                │ └─────────┘│
│ ☑ Rooms │                                │ Circuit:  │
│ ☑ Elec  │                                │ Kitchen-1 │
│ ☐ Wire  │                                │ Breaker:2 │
└─────────┴────────────────────────────────┴───────────┘
```

#### 3.2 Data Model Integration
**Requirements:**
- Extend floor plan data model to include electrical components
- Maintain relationships between rooms, components, circuits, and panels
- Auto-save electrical data with floor plan
- Import/export including electrical information

**Data Structure:**
```javascript
const floorPlanWithElectrical = {
  id: 'plan_123',
  name: 'My House',
  rooms: [...],
  electrical: {
    panels: [
      {
        id: 'panel_1',
        name: 'Main Panel',
        x: 50, y: 100,
        type: '200A_30_position',
        breakers: [
          { position: 1, amperage: 15, type: 'single', label: 'Kitchen Lights' },
          { position: 2, amperage: 20, type: 'single', label: 'Kitchen Outlets' }
        ]
      }
    ],
    components: [
      {
        id: 'comp_1',
        type: 'duplex_outlet',
        x: 150, y: 200,
        room_id: 'room_kitchen',
        circuit_id: 'circuit_2',
        properties: { voltage: 120, amperage: 20, gfci: true }
      }
    ],
    circuits: [
      {
        id: 'circuit_2',
        panel_id: 'panel_1',
        breaker_position: 2,
        wire_gauge: '12 AWG',
        components: ['comp_1', 'comp_2']
      }
    ]
  }
};
```

## TECHNICAL IMPLEMENTATION

### 1. COMPONENT ARCHITECTURE

#### New Components to Create:
```
src/components/electrical/
├── ElectricalModeToolbar.js         # Electrical-specific tools
├── ElectricalSymbolPalette.js       # Component selection
├── ElectricalComponentLayer.js      # Render electrical components
├── CircuitVisualization.js          # Circuit line rendering
├── PanelVisualization.js            # Electrical panel display
├── ComponentPropertiesPanel.js     # Component details editor
├── CircuitManager.js                # Circuit creation/editing
└── ElectricalSymbols/               # Symbol library
    ├── OutletSymbols.js
    ├── LightSymbols.js
    ├── SwitchSymbols.js
    └── PanelSymbols.js
```

#### Modified Components:
```
src/components/
├── FloorPlanDrawer.js               # Add electrical mode integration
├── MainScreen.js                    # Update workflow
└── MenuBar.js                       # Add electrical menu items
```

### 2. DATABASE SCHEMA UPDATES

```sql
-- Add electrical components table
CREATE TABLE electrical_components (
    id SERIAL PRIMARY KEY,
    floor_plan_id INTEGER REFERENCES floor_plans(id),
    room_id INTEGER REFERENCES rooms(id),
    component_type VARCHAR(50) NOT NULL,
    x_position FLOAT NOT NULL,
    y_position FLOAT NOT NULL,
    rotation FLOAT DEFAULT 0,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add electrical panels table
CREATE TABLE electrical_panels (
    id SERIAL PRIMARY KEY,
    floor_plan_id INTEGER REFERENCES floor_plans(id),
    panel_name VARCHAR(100) NOT NULL,
    x_position FLOAT NOT NULL,
    y_position FLOAT NOT NULL,
    panel_type VARCHAR(50) NOT NULL,
    main_breaker_amps INTEGER,
    total_positions INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add circuits table
CREATE TABLE electrical_circuits (
    id SERIAL PRIMARY KEY,
    panel_id INTEGER REFERENCES electrical_panels(id),
    circuit_number INTEGER NOT NULL,
    breaker_type VARCHAR(20) NOT NULL,
    amperage INTEGER NOT NULL,
    wire_gauge VARCHAR(10),
    circuit_label VARCHAR(100),
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add component-circuit relationships
CREATE TABLE component_circuits (
    id SERIAL PRIMARY KEY,
    component_id INTEGER REFERENCES electrical_components(id),
    circuit_id INTEGER REFERENCES electrical_circuits(id),
    load_watts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_components_floor_plan ON electrical_components(floor_plan_id);
CREATE INDEX idx_components_room ON electrical_components(room_id);
CREATE INDEX idx_circuits_panel ON electrical_circuits(panel_id);
```

### 3. API ENDPOINTS

#### New Backend Routes:
```javascript
// Electrical components
GET    /api/electrical-components/:floor_plan_id
POST   /api/electrical-components
PUT    /api/electrical-components/:id
DELETE /api/electrical-components/:id

// Electrical panels
GET    /api/electrical-panels/:floor_plan_id
POST   /api/electrical-panels
PUT    /api/electrical-panels/:id
DELETE /api/electrical-panels/:id

// Circuits
GET    /api/circuits/:panel_id
POST   /api/circuits
PUT    /api/circuits/:id
DELETE /api/circuits/:id

// Bulk operations
POST   /api/electrical/bulk-import
GET    /api/electrical/export/:floor_plan_id
```

### 4. STATE MANAGEMENT

#### Additional State in FloorPlanDrawer:
```javascript
const [electricalMode, setElectricalMode] = useState(false);
const [selectedTool, setSelectedTool] = useState('select'); // select, outlet, light, switch, wire
const [electricalComponents, setElectricalComponents] = useState([]);
const [electricalPanels, setElectricalPanels] = useState([]);
const [circuits, setCircuits] = useState([]);
const [selectedComponent, setSelectedComponent] = useState(null);
const [showCircuits, setShowCircuits] = useState(true);
const [currentCircuit, setCurrentCircuit] = useState(null);
```

## USER EXPERIENCE REQUIREMENTS

### 1. WORKFLOW INTEGRATION
**User Journey:**
1. User creates or loads a floor plan with rooms
2. User toggles to "Electrical Mode"
3. User selects electrical component type from palette
4. User clicks on floor plan to place component
5. User assigns component to circuit (auto-suggest available circuits)
6. System draws circuit line from component to panel
7. User continues placing components and managing circuits
8. User can toggle circuit visibility on/off for clean views
9. User saves complete floor plan with electrical information

### 2. INTUITIVE INTERACTIONS
**Requirements:**
- Component placement should feel natural and responsive
- Circuit connections should be visually clear but not cluttered
- Properties panel should update contextually based on selection
- Keyboard shortcuts for common electrical operations
- Visual feedback for valid/invalid placement locations

### 3. VISUAL DESIGN STANDARDS
**Requirements:**
- Electrical symbols should follow industry standards
- Circuit colors should be distinct and colorblind-friendly
- Component selection should be clearly indicated
- Panel visualization should be professional and readable
- Overall design should maintain consistency with existing UI

## TESTING REQUIREMENTS

### 1. FUNCTIONAL TESTING
- [ ] Component placement in various room configurations
- [ ] Circuit creation and assignment
- [ ] Panel breaker assignment
- [ ] Data persistence across save/load cycles
- [ ] Undo/redo operations with electrical components
- [ ] Component property editing
- [ ] Circuit visualization toggle

### 2. PERFORMANCE TESTING
- [ ] Response time for component placement (<100ms)
- [ ] Smooth interaction with 50+ electrical components
- [ ] Memory usage with complex floor plans
- [ ] Circuit line rendering performance

### 3. USER ACCEPTANCE TESTING
- [ ] Electrician workflow validation
- [ ] Symbol recognition and clarity
- [ ] Circuit assignment ease of use
- [ ] Overall integration smoothness

## SUCCESS CRITERIA

### Phase 1 Completion Criteria:
1. **Integration Complete**: Users can create floor plans and place electrical components in same editor
2. **Circuit Visualization**: Visual connections between components and panel breakers
3. **Data Persistence**: Electrical data saves/loads with floor plans
4. **User Feedback**: 90%+ positive feedback on workflow integration
5. **Performance**: No degradation in floor plan creation performance
6. **Standards Compliance**: Electrical symbols follow industry standards

### Key Performance Indicators:
- Time to place 10 electrical components: <2 minutes
- Learning curve for existing users: <30 minutes
- System responsiveness: All interactions <200ms
- Data accuracy: 100% save/load fidelity

## ROLLOUT PLAN

### Week 1-2: Foundation
- Set up database schema
- Create basic electrical component data models
- Implement component placement infrastructure

### Week 3-4: Core Features
- Build electrical symbol library
- Implement component placement and editing
- Add basic panel visualization

### Week 5-6: Circuit System
- Implement circuit creation and management
- Add visual circuit line rendering
- Connect components to panel breakers

### Week 7-8: Integration & Polish
- Integrate electrical mode into FloorPlanDrawer
- Add properties panels and editing
- Implement save/load for electrical data

### Week 9-10: Testing & Refinement
- User acceptance testing with target users
- Performance optimization
- Bug fixes and UI improvements

This Phase 1 implementation will create a solid foundation for the comprehensive electrical system documentation tool while maintaining the quality and usability of the existing floor plan creation system.
