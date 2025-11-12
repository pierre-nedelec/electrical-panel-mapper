import config from '../config';

/**
 * Service for managing device types data from the API
 */
class DeviceTypesService {
  constructor() {
    this.deviceTypes = null;
    this.deviceTypesById = new Map();
    this.deviceTypesByCategory = new Map();
    this.loading = false;
  }

  /**
   * Fetch device types from the API
   * @returns {Promise<Array>} Array of device types
   */
  async fetchDeviceTypes() {
    if (this.loading) {
      // Wait for existing request to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return this.deviceTypes;
    }

    if (this.deviceTypes) {
      return this.deviceTypes;
    }

    this.loading = true;
    
    try {
      const response = await fetch(`${config.BACKEND_URL}/api/electrical/symbols`);
      if (!response.ok) {
        throw new Error(`Failed to fetch device types: ${response.statusText}`);
      }
      
      this.deviceTypes = await response.json();
      
      // Build lookup maps for performance
      this.deviceTypesById.clear();
      this.deviceTypesByCategory.clear();
      
      this.deviceTypes.forEach(deviceType => {
        this.deviceTypesById.set(deviceType.id, deviceType);
        
        if (!this.deviceTypesByCategory.has(deviceType.category)) {
          this.deviceTypesByCategory.set(deviceType.category, []);
        }
        this.deviceTypesByCategory.get(deviceType.category).push(deviceType);
      });

      console.log(`✅ Loaded ${this.deviceTypes.length} device types from API`);
      return this.deviceTypes;
      
    } catch (error) {
      console.error('Error fetching device types:', error);
      // Return fallback data if API fails
      return this.getFallbackDeviceTypes();
    } finally {
      this.loading = false;
    }
  }

  /**
   * Get device type by ID
   * @param {number} id Device type ID
   * @returns {Object|null} Device type or null if not found
   */
  getDeviceTypeById(id) {
    return this.deviceTypesById.get(id) || null;
  }

  /**
   * Get device types by category
   * @param {string} category Category name
   * @returns {Array} Array of device types in the category
   */
  getDeviceTypesByCategory(category) {
    return this.deviceTypesByCategory.get(category) || [];
  }

  /**
   * Map device_type_id back to component type for UI
   * @param {number} deviceTypeId Database device type ID
   * @returns {string} UI component type (outlet, light, switch, appliance)
   */
  getComponentType(deviceTypeId) {
    const deviceType = this.getDeviceTypeById(deviceTypeId);
    if (!deviceType) {
      return 'outlet'; // Default fallback
    }

    switch (deviceType.category) {
      case 'lighting':
        return 'light';
      case 'receptacle':
        return 'outlet';
      case 'control':
        return 'switch';
      case 'appliance':
      case 'heating':
      case 'hvac':
        return 'appliance';
      default:
        return 'outlet';
    }
  }

  /**
   * Map device_type_id to appliance_type for appliances
   * @param {number} deviceTypeId Database device type ID
   * @returns {string} Appliance type identifier
   */
  getApplianceType(deviceTypeId) {
    const deviceType = this.getDeviceTypeById(deviceTypeId);
    if (!deviceType) {
      return 'baseboard_heater';
    }

    // Convert device type name to snake_case for appliance_type
    // This creates a consistent mapping without hardcoding
    const applianceType = deviceType.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores

    // Handle some special cases for better UX
    const specialMappings = {
      'range_oven': 'electric_range',
      'water_heater': 'electric_water_heater',
      'dryer': 'electric_dryer'
    };

    return specialMappings[applianceType] || applianceType || 'baseboard_heater';
  }

  /**
   * Map component type and appliance type to device_type_id
   * @param {string} componentType UI component type
   * @param {string} applianceType Appliance type (for appliances)
   * @returns {number} Database device type ID
   */
  getDeviceTypeId(componentType, applianceType = null) {
    if (!this.deviceTypes) {
      // Return fallback mappings if data not loaded yet
      return this.getFallbackDeviceTypeId(componentType, applianceType);
    }

    switch (componentType) {
      case 'light':
        const lightType = this.deviceTypes.find(dt => dt.category === 'lighting');
        return lightType ? lightType.id : 6;
        
      case 'outlet':
        const outletType = this.deviceTypes.find(dt => dt.category === 'receptacle');
        return outletType ? outletType.id : 7;
        
      case 'switch':
        const switchType = this.deviceTypes.find(dt => dt.category === 'control');
        return switchType ? switchType.id : 9;
        
      case 'appliance':
        if (applianceType) {
          // Reverse the appliance type conversion - convert snake_case back to title case
          let searchName = applianceType
            .replace(/^electric_/, '') // Remove electric_ prefix
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          // Handle special cases
          if (applianceType === 'electric_range') {
            searchName = 'Range/Oven';
          } else if (applianceType === 'electric_water_heater') {
            searchName = 'Water Heater';
          } else if (applianceType === 'electric_dryer') {
            searchName = 'Dryer';
          }

          // Try to find exact match first
          let deviceType = this.deviceTypes.find(dt => dt.name === searchName);
          
          // If not found, try a more flexible search
          if (!deviceType) {
            const searchLower = searchName.toLowerCase();
            deviceType = this.deviceTypes.find(dt => 
              dt.name.toLowerCase().includes(searchLower) ||
              searchLower.includes(dt.name.toLowerCase())
            );
          }
          
          if (deviceType) return deviceType.id;
        }
        
        // Default to first appliance category device or baseboard heater
        const applianceTypes = this.deviceTypes.filter(dt => 
          dt.category === 'appliance' || dt.category === 'heating'
        );
        const baseboardType = applianceTypes.find(dt => 
          dt.name.toLowerCase().includes('baseboard')
        );
        return baseboardType ? baseboardType.id : (applianceTypes[0]?.id || 1);
        
      default:
        const defaultType = this.deviceTypes.find(dt => dt.category === 'receptacle');
        return defaultType ? defaultType.id : 7;
    }
  }

  /**
   * Fallback device type mappings for when API is not available
   */
  getFallbackDeviceTypeId(componentType, applianceType) {
    switch (componentType) {
      case 'light': return 6;
      case 'outlet': return 7;
      case 'switch': return 9;
      case 'appliance':
        switch (applianceType) {
          case 'baseboard_heater': return 1;
          case 'ceiling_fan': return 2;
          case 'hvac_unit': return 3;
          case 'jacuzzi': return 5;
          case 'electric_range': return 8;
          case 'electric_water_heater': return 10;
          case 'dishwasher': return 11;
          case 'electric_dryer': return 12;
          case 'garbage_disposal': return 13;
          default: return 1;
        }
      default: return 7;
    }
  }

  /**
   * Fallback device types for when API is not available
   */
  getFallbackDeviceTypes() {
    return [
      { id: 1, name: 'Baseboard Heater', icon: 'Thermostat', category: 'appliance' },
      { id: 2, name: 'Ceiling Fan', icon: 'Air', category: 'appliance' },
      { id: 3, name: 'HVAC Unit', icon: 'Air', category: 'appliance' },
      { id: 4, name: 'Heater', icon: 'LocalFireDepartment', category: 'appliance' },
      { id: 5, name: 'Jacuzzi', icon: 'HotTub', category: 'appliance' },
      { id: 6, name: 'Light', icon: 'Lightbulb', category: 'lighting' },
      { id: 7, name: 'Outlet', icon: 'Outlet', category: 'receptacle' },
      { id: 8, name: 'Range/Oven', icon: 'Kitchen', category: 'appliance' },
      { id: 9, name: 'Switch', icon: 'ToggleOn', category: 'control' },
      { id: 10, name: 'Water Heater', icon: 'Water', category: 'appliance' },
      { id: 11, name: 'Dishwasher', icon: 'Kitchen', category: 'appliance' },
      { id: 12, name: 'Dryer', icon: 'LocalLaundryService', category: 'appliance' },
      { id: 13, name: 'Garbage Disposal', icon: 'Delete', category: 'appliance' }
    ];
  }

  /**
   * Clear cached data (useful for testing or forcing refresh)
   */
  clearCache() {
    this.deviceTypes = null;
    this.deviceTypesById.clear();
    this.deviceTypesByCategory.clear();
  }
}

// Create and export a singleton instance
const deviceTypesService = new DeviceTypesService();
export default deviceTypesService;
