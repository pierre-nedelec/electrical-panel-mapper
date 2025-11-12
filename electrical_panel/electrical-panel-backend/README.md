# Electrical Panel Mapper Backend

A modular Express.js backend for the Electrical Panel Mapper application with support for both local development and Home Assistant addon deployment.

## 🏗️ Architecture

The backend has been refactored from a monolithic structure into a modular architecture:

```
src/
├── config/           # Configuration and environment detection
│   └── index.js      # Port, database, and addon configuration
├── database/         # Database management
│   └── index.js      # SQLite initialization and table creation
├── docs/             # API documentation
│   └── swagger.js    # OpenAPI/Swagger configuration
├── middleware/       # Express middleware
│   └── index.js      # CORS, IP filtering, JSON parsing
├── routes/           # API route handlers
│   ├── index.js      # Main router with health and backup endpoints
│   ├── entities.js   # Electrical entities/components CRUD
│   ├── rooms.js      # Room management
│   ├── floorPlans.js # Floor plan management
│   └── electrical.js # Electrical system (panels, circuits, components)
├── services/         # Business logic services
│   └── backupService.js # Database backup functionality
├── tests/            # Test files
│   ├── setup.js      # Test configuration and utilities
│   └── api.test.js   # Comprehensive API tests
└── app.js           # Main application setup
```

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns with dedicated modules
- **SQLite Database**: Automatic table creation and seeding
- **RESTful API**: Comprehensive REST endpoints with proper HTTP status codes
- **OpenAPI Documentation**: Auto-generated Swagger UI at `/api/docs`
- **Comprehensive Testing**: Jest + Supertest with full coverage
- **Home Assistant Integration**: IP filtering and backup functionality
- **Environment Detection**: Automatic Docker/addon detection
- **Graceful Shutdown**: Proper cleanup on termination signals

## 📚 API Documentation

The API is fully documented with OpenAPI/Swagger specifications:

- **Swagger UI**: `http://localhost:3001/api/docs`
- **OpenAPI JSON**: `http://localhost:3001/api/docs/json`

### Main Endpoints

- `GET /api/health` - System health check
- `GET /api/floor-plans` - Floor plan management
- `GET /api/entities` - Electrical entities/components
- `GET /api/rooms` - Room management
- `GET /api/electrical/*` - Electrical system management
- `POST /api/backup/create` - Manual backup creation

## 🛠️ Development

### Prerequisites

- Node.js 16.0.0 or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix
```

## 🐳 Docker & Home Assistant

The backend automatically detects Docker environments and adjusts configuration:

- **Port**: Forces port 8080 in Docker for Home Assistant compatibility
- **Database**: Uses `/data/database.db` in Home Assistant addon
- **Backups**: Automatic backup scheduling in `/data/backups/`
- **Security**: IP filtering for Home Assistant ingress

### Environment Variables

- `DATABASE_PATH`: Custom database file path (default: `./database.db`)
- `PORT`: Server port (default: 3001, forced to 8080 in Docker)
- `NODE_ENV`: Environment mode (development/production)

## 🗄️ Database Schema

The backend uses SQLite with the following main tables:

- `floor_plans` - Floor plan metadata and SVG content
- `rooms` - Room definitions with SVG references
- `entities` - Electrical components with positioning and properties
- `electrical_panels` - Electrical panel configurations
- `electrical_circuits` - Circuit definitions and breaker assignments
- `device_types` - Available electrical device types

## 🔧 Configuration

### Home Assistant Addon Options

```json
{
  "log_level": "info",
  "database_backup": true,
  "backup_interval": 24
}
```

### Local Development

Create a `.env` file for local configuration:

```env
DATABASE_PATH=./dev-database.db
PORT=3001
NODE_ENV=development
```

## 🔒 Security

- **IP Filtering**: Restricts access to allowed IPs for Home Assistant ingress
- **Input Validation**: Proper validation of all API inputs
- **SQL Injection Protection**: Uses parameterized queries
- **CORS**: Configurable CORS for cross-origin requests

## 📊 Monitoring

- **Health Endpoint**: `/api/health` provides system status
- **Logging**: Structured logging with emojis for easy reading
- **Error Handling**: Comprehensive error responses with proper HTTP codes

## 🔄 Migration from v1.x

The refactored backend maintains full backward compatibility:

- All existing endpoints continue to work
- Legacy routes redirect to new endpoints
- Database schema is automatically updated
- No breaking changes to the API contract

### Legacy Route Mappings

- `/device-types` → `/api/electrical/symbols`
- `/electrical-panels` → `/api/electrical/panels`
- `/electrical-circuits` → `/api/electrical/circuits`
- `/breakers` → **Deprecated** (use `/api/electrical/circuits`)

## 🧪 Testing Strategy

The test suite covers:

- **Unit Tests**: Individual module functionality
- **Integration Tests**: API endpoint testing
- **Error Handling**: Proper error responses
- **Database Operations**: CRUD operations
- **Authentication**: IP filtering and security

### Test Coverage

Current test coverage includes:
- All API endpoints
- Database operations
- Error scenarios
- Legacy route compatibility
- Backup functionality

## 📈 Performance

- **In-Memory Testing**: Uses SQLite `:memory:` for fast tests
- **Connection Pooling**: Efficient database connection management
- **Async Operations**: Non-blocking I/O operations
- **Graceful Shutdown**: Proper cleanup prevents resource leaks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the API documentation at `/api/docs`
2. Review the test files for usage examples
3. Open an issue on GitHub
4. Check Home Assistant addon logs for deployment issues
