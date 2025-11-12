# API Reference - Electrical Panel Mapper

Quick reference for all available backend endpoints. Base URL: `http://localhost:3001/api`

## System & Backup

- `GET /health` - Health check
- `POST /backup/create` - Create manual backup
- `GET /backup/list` - List available backups

## Core Data Management

### Entities (Outlets, Switches, Fixtures)
- `GET /entities` - Get all entities
- `GET /entities/:id` - Get entity by ID
- `POST /entities` - Create new entity
- `PUT /entities/:id` - Update entity
- `DELETE /entities/:id` - Delete entity

### Rooms
- `GET /rooms` - Get all rooms
- `POST /rooms` - Create new room
- `DELETE /rooms/:id` - Delete room

### Floor Plans
- `GET /floor-plans` - Get all floor plans
- `GET /floor-plans/:id` - Get floor plan by ID
- `POST /floor-plans` - Create new floor plan
- `PUT /floor-plans/:id` - Update floor plan
- `DELETE /floor-plans/:id` - Delete floor plan

## Electrical System

### Panels
- `GET /electrical/panels` - Get all electrical panels
- `GET /electrical/panels/:id` - Get panel by ID
- `POST /electrical/panels` - Create new panel
- `PUT /electrical/panels/:id` - Update panel
- `DELETE /electrical/panels/:id` - Delete panel

### Circuits
- `GET /electrical/circuits` - Get all circuits
- `POST /electrical/circuits` - Create new circuit
- `PUT /electrical/circuits/:id` - Update circuit
- `DELETE /electrical/circuits/:id` - Delete circuit

### Components
- `GET /electrical/components` - Get all electrical components
- `POST /electrical/components` - Create new component
- `PUT /electrical/components/:id` - Update component
- `DELETE /electrical/components/:id` - Delete component

### Symbols
- `GET /electrical/symbols` - Get electrical symbols/device types

## Professional Features

### Custom Device Types
- `GET /device-types` - Get all device types (system + custom)
- `GET /device-types/categories` - Get device categories
- `GET /device-types/:id` - Get device type by ID
- `POST /device-types` - Create custom device type
- `PUT /device-types/:id` - Update device type
- `DELETE /device-types/:id` - Delete custom device type

### Load Calculations
- `GET /load-calculations/circuit/:circuit_id` - Circuit load analysis
- `GET /load-calculations/panel/:panel_id` - Panel load analysis
- `GET /load-calculations/floor-plan/:floor_plan_id` - Floor plan load analysis
- `GET /load-calculations/recommendations/:circuit_id` - Load balancing recommendations

### Code Compliance (NEC)
- `POST /code-compliance/check/:floor_plan_id` - Run compliance check
- `GET /code-compliance/violations/:floor_plan_id` - Get violations
- `PUT /code-compliance/violations/:violation_id/resolve` - Mark violation resolved
- `GET /code-compliance/templates` - Get compliance templates

### Materials & Cost Estimation
- `POST /materials/generate/:floor_plan_id` - Generate materials list
- `GET /materials/:floor_plan_id` - Get materials list
- `GET /materials/:floor_plan_id/export` - Export materials as CSV

## Legacy Endpoints (Deprecated)

- `GET /device-types` → Redirects to `/electrical/symbols`
- `GET /breakers` → Returns 410 (use `/electrical/circuits`)
- `GET /electrical-panels` → Redirects to `/electrical/panels`
- `GET /electrical-circuits` → Redirects to `/electrical/circuits`

## Common Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional details"
}
```

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "Field is required"
  }
}
```

## Key Features

- **Full CRUD** operations for all entities
- **Professional load calculations** with NEC compliance
- **Custom device types** with electrical specifications
- **Automated materials lists** with cost estimation
- **Code compliance checking** with violation tracking
- **Comprehensive error handling** with validation
- **Swagger documentation** available at `/api-docs`

## Development Notes

- All endpoints return JSON
- Authentication/authorization not yet implemented
- Database automatically backs up on startup
- Supports both local development and Home Assistant addon deployment
- Full API documentation available at `http://localhost:3001/api-docs` 