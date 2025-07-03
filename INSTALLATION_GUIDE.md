# 🏠 Home Assistant Installation Guide
## Electrical Panel Mapper Add-on

## 📋 Summary of Changes Made

Your electrical panel application has been successfully containerized and prepared for Home Assistant! Here's what was accomplished:

### ✅ **Containerization Complete**

1. **Multi-stage Dockerfile**: Optimized build that creates a production-ready container
2. **Home Assistant Add-on Configuration**: Full `config.yaml` with proper metadata and options
3. **Single-server Architecture**: Frontend and backend now run in one container on port 8080
4. **Persistent Storage**: Database stored in `/data` directory that maps to HA persistent volumes
5. **Production Optimizations**: Non-root user, health checks, proper logging

### ✅ **Code Modifications**

1. **Backend Updates**:
   - Added static file serving for React build
   - Environment-based database path configuration
   - Catch-all route handler for React Router
   - Enhanced logging for HA environment

2. **Frontend Configuration**:
   - Updated API calls to use same-origin (no separate backend port)
   - Production-ready configuration

3. **Build Scripts**:
   - Automated build and test script (`build-addon.sh`)
   - Docker ignore file for optimized builds
   - Comprehensive documentation

## 🚀 Installation Steps

### Step 1: Transfer Files to Home Assistant

You'll need to copy your project to your Home Assistant system. Choose the method that works for your setup:

#### Option A: Direct Copy (if you have file access)
```bash
# Copy the entire electrical-panel folder to HA addons directory
scp -r electrical-panel root@your-ha-ip:/usr/share/hassio/addons/local/
```

#### Option B: Using Home Assistant File Editor Add-on
1. Install "File Editor" add-on in Home Assistant
2. Create folder `/addon_configs/local/electrical-panel/`
3. Upload all files through the File Editor interface

#### Option C: SSH into Home Assistant
```bash
# SSH into your HA system
ssh root@your-ha-ip

# Create the addon directory
mkdir -p /usr/share/hassio/addons/local/electrical-panel

# Transfer files using your preferred method (scp, rsync, etc.)
```

### Step 2: Install the Add-on

1. **Access Home Assistant**:
   - Open your Home Assistant web interface
   - Go to **Supervisor** → **Add-on Store**

2. **Refresh Local Add-ons**:
   - Click the menu (⋮) in the top right
   - Select **"Check for updates"** or restart Supervisor if needed

3. **Install the Add-on**:
   - Scroll down to **"Local add-ons"** section
   - Find **"Electrical Panel Mapper"**
   - Click **"Install"**

### Step 3: Configure and Start

1. **Configuration** (optional):
   ```yaml
   log_level: info
   database_backup: true
   backup_interval: 24
   ```

2. **Start the Add-on**:
   - Click **"Start"**
   - Enable **"Start on boot"** for persistence
   - Enable **"Watchdog"** for automatic restart if needed

3. **Access the Application**:
   - Click **"Open Web UI"** in the add-on interface
   - Or navigate to `http://your-ha-ip:8080`

## 🧪 Local Testing (Optional)

If you want to test the containerization locally before installing on HA:

### Prerequisites
- Docker Desktop installed and running
- At least 2GB free disk space

### Testing Steps
```bash
# Start Docker Desktop first, then:
cd electrical-panel
./build-addon.sh

# This will:
# 1. Build the Docker image
# 2. Start a test container on port 8080
# 3. Test the application
# 4. Provide access at http://localhost:8080
```

### Clean Up Test
```bash
# Stop and remove test container
./build-addon.sh clean
```

## 📱 Using the Application

### First Time Setup
1. **Create Your First Project**:
   - Click "Start New Project"
   - Name your electrical project (e.g., "Main House")

2. **Draw Your Floor Plan**:
   - Choose from templates or draw custom
   - Add rooms and label them
   - Save your floor plan

3. **Configure Electrical Panels**:
   - Add electrical panels to your floor plan
   - Set main breaker size (typically 100A, 200A, etc.)
   - Configure total breaker positions

4. **Add Circuits**:
   - Create circuits for each breaker position
   - Set amperage ratings and wire gauges
   - Label circuits (e.g., "Kitchen Outlets", "Living Room Lights")

5. **Map Components**:
   - Place electrical components (outlets, lights, switches)
   - Assign components to specific circuits
   - View load calculations and panel utilization

### Data Persistence
- All your electrical panel data is automatically saved
- Database persists across Home Assistant reboots
- Optional automatic backups (if enabled)

## 🔧 Troubleshooting

### Add-on Won't Install
- Ensure files are in correct location: `/usr/share/hassio/addons/local/electrical-panel/`
- Check file permissions (should be readable by hassio user)
- Restart Home Assistant Supervisor

### Add-on Won't Start
- Check add-on logs: Supervisor → Electrical Panel Mapper → Logs
- Ensure port 8080 isn't used by another service
- Verify adequate storage space (>500MB free)

### Can't Access Web Interface
- Confirm add-on is running (green icon)
- Check firewall settings
- Try direct IP access: `http://HA_IP:8080`

### Database Issues
```bash
# Reset database (⚠️ Loses all data)
# Stop add-on, then SSH into HA:
rm /usr/share/hassio/addon_configs/local/electrical-panel/database.db
# Start add-on again
```

## 🎯 Benefits of This Setup

### ✅ **Always Available**
- Accessible from any device on your network
- No need to start/stop separate services
- Survives Home Assistant reboots

### ✅ **Professional Integration**
- Native Home Assistant add-on experience
- Integrated logging and monitoring
- Proper resource management

### ✅ **Data Security**
- All data stored locally on your Raspberry Pi
- No external cloud dependencies
- Optional automatic backups

### ✅ **Mobile Friendly**
- Responsive web interface
- Works on phones, tablets, laptops
- Real-time updates across devices

## 📞 Support

### Application Issues
- Check the logs in Home Assistant Supervisor
- Verify network connectivity to the add-on
- Ensure adequate system resources

### Electrical Questions
- This tool is for documentation only
- Always consult licensed electricians for actual work
- Follow local electrical codes and regulations

---

**🎉 Congratulations!** Your electrical panel mapper is now ready to run as a professional Home Assistant add-on. You'll have persistent access to document and manage your electrical systems from anywhere in your home network. 