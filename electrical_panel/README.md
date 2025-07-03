# 🔌 Electrical Panel Mapper - Home Assistant Add-on

A professional electrical panel documentation and floor plan mapping tool for Home Assistant.

## Features

✅ **Complete Electrical Documentation System**
- Interactive floor plan creation and editing
- Electrical panel configuration with circuit management
- Component placement (outlets, lights, switches, appliances)
- Load calculations and electrical analysis
- Visual circuit tracing and connections

✅ **Home Assistant Integration**
- Runs as a native HA add-on
- Persistent data storage in HA volumes
- Accessible from any device on your network
- No external dependencies

✅ **Professional Tools**
- Standard electrical symbols (IEEE/NFPA)
- Breaker panel visualization
- Wire gauge and amperage calculations
- NEC code compliance features
- Professional documentation output

## Installation

### Method 1: Local Build (Recommended)

1. **Copy Files to Home Assistant**
   ```bash
   # Copy the electrical-panel folder to your HA addons directory
   cp -r electrical-panel /usr/share/hassio/addons/local/
   ```

2. **Build the Add-on**
   - Go to Home Assistant → Supervisor → Add-on Store
   - Click the menu (⋮) in the top right
   - Select "Repositories"
   - Add local repository (if not already added)
   - Find "Electrical Panel Mapper" in Local Add-ons
   - Click "Install"

3. **Configure and Start**
   - Set your preferred options in the Configuration tab
   - Click "Start" 
   - Enable "Start on boot" for persistent availability

### Method 2: Manual Docker Build

1. **Build the Image**
   ```bash
   cd electrical-panel
   docker build -t local/electrical-panel-mapper .
   ```

2. **Install in Home Assistant**
   - Follow steps 2-3 above

## Configuration

### Add-on Options

```yaml
log_level: info                    # Logging level (trace|debug|info|notice|warning|error|fatal)
database_backup: true             # Enable automatic database backups
backup_interval: 24               # Backup interval in hours (1-168)
```

### Network Access

The add-on will be available at:
- **Home Assistant UI**: Supervisor → Electrical Panel Mapper → "Open Web UI"
- **Direct Access**: `http://YOUR_HA_IP:8080`
- **Internal Access**: `http://homeassistant.local:8080`

## Usage

### 1. Create Your First Project
- Open the add-on web interface
- Click "Start New Project"
- Choose from templates or draw a custom floor plan

### 2. Configure Electrical Panels
- Add electrical panels to your floor plan
- Configure main breaker size and total positions
- Add circuits with proper amperage and wire gauges

### 3. Map Components
- Place electrical components (outlets, lights, switches)
- Assign components to specific circuits
- View load calculations and panel utilization

### 4. Professional Documentation
- Generate panel schedules
- Export electrical drawings
- Print professional documentation

## Data Persistence

Your electrical panel data is automatically saved to:
- **Database**: `/addon_config/database.db`
- **Backups**: `/addon_config/backups/` (if enabled)

All data persists across add-on restarts and Home Assistant reboots.

## Troubleshooting

### Add-on Won't Start
```bash
# Check logs in Home Assistant
Supervisor → Electrical Panel Mapper → Logs

# Common issues:
# - Port 8080 already in use
# - Insufficient storage space
# - Permission issues
```

### Database Issues
```bash
# Reset database (⚠️ Will lose all data)
# Stop add-on, then:
rm /addon_config/database.db
# Start add-on again
```

### Access Issues
- Ensure port 8080 is not blocked by firewall
- Check Home Assistant network configuration
- Verify add-on is running (green icon in Supervisor)

## Advanced Configuration

### Custom Database Location
```yaml
# In add-on configuration
DATABASE_PATH: "/addon_config/custom_location.db"
```

### Development Mode
```yaml
# Enable debug logging
log_level: debug
```

## Support

For issues specific to the Home Assistant add-on:
1. Check add-on logs first
2. Verify Home Assistant system requirements
3. Ensure adequate storage space (>500MB)
4. Check network connectivity

For application features and functionality:
- See the main project documentation
- Review electrical engineering best practices
- Consult NEC code requirements

---

**⚡ Safety Note**: This tool is for documentation purposes. Always consult licensed electricians for actual electrical work and ensure compliance with local electrical codes. 