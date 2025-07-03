# Electrical Panel Mapper - Home Assistant Add-on Repository

Professional electrical panel documentation and floor plan mapping tool for Home Assistant.

## Installation

Add this repository to your Home Assistant instance:

1. **In Home Assistant** → **Supervisor** → **Add-on Store**
2. **Click menu (⋮)** in top right → **Repositories**
3. **Add repository URL**: `https://github.com/pierre-nedelec/electrical-panel-mapper`
4. **Refresh** the add-on store
5. **Find "Electrical Panel Mapper"** in the new repository section
6. **Install** and enjoy! 🔌

## About the Add-on

## Features

- **Floor Plan Creation**: Choose from templates, draw custom floor plans, or upload existing SVG files
- **Interactive Room Management**: Click, drag, resize, and label rooms
- **Electrical Component Mapping**: Assign electrical components to rooms with visual connections
- **Save/Load Floor Plans**: Store multiple named floor plans with automatic save/load
- **Keyboard Shortcuts**: 
  - `Delete`: Remove selected room
  - `Ctrl+D`: Duplicate selected room
  - `Ctrl+Arrow Keys`: Move selected room
  - `Ctrl+S`: Save current floor plan
  - `Ctrl+O`: Load saved floor plans
  - `Escape`: Cancel current operation

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Backend Setup**
```bash
cd electrical-panel-backend
npm install
npm start
```
The backend will start on `http://localhost:3001`

2. **Frontend Setup** (in a new terminal)
```bash
cd electrical-panel-mapper
npm install
npm start
```
The frontend will start on `http://localhost:3002`

### Usage

1. **Choose Your Starting Point**:
   - **Templates**: Select from pre-built floor plan templates (studio, 1-bedroom, house, blank)
   - **Draw New**: Create a custom floor plan using the drawing tool
   - **Load Saved**: Continue working on previously saved floor plans
   - **Upload SVG**: Import an existing SVG floor plan

2. **Create Rooms**:
   - Click points to define room boundaries
   - Double-click to close and complete a room
   - Use the toolbar to switch between Select, Draw, Move, and Resize modes

3. **Edit Rooms**:
   - Select rooms to see resize handles
   - Drag rooms to move them
   - Use resize handles to adjust room size
   - Right-click or use keyboard shortcuts for additional options

4. **Save Your Work**:
   - Use `Ctrl+S` or the menu to save your floor plan
   - Give it a descriptive name for easy retrieval
   - All floor plans are saved both locally and on the server

## Architecture

- **Frontend**: React application with SVG-based drawing and interaction
- **Backend**: Node.js/Express server with SQLite database
- **Storage**: Dual storage system (server database + localStorage fallback)

## Documentation

For comprehensive project documentation, see the **[docs/](docs/)** folder:

- **[📋 Next Steps Implementation Plan](docs/roadmap/NEXT_STEPS.md)** - ⭐ Current development priorities
- **[🔬 User Research](docs/user-research/)** - Electrician use cases and UX improvements  
- **[🛠 Technical Documentation](docs/technical/)** - Requirements, implementation, and architecture
- **[🗺 Roadmap & Planning](docs/roadmap/)** - Strategic planning and development timeline
- **[📊 Status & Progress](docs/status/)** - Development milestones and issue resolution

**Quick Start:** Begin with the **[Next Steps Implementation Plan](docs/roadmap/NEXT_STEPS.md)** for current priorities and implementation roadmap.

## Development

The application uses:
- React hooks for state management
- SVG for graphics rendering
- Custom hooks for pan/zoom and room management
- RESTful API for floor plan persistence
