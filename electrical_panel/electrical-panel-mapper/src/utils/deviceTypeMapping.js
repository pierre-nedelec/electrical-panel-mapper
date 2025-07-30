/**
 * Utility functions for mapping between device_type_id and component types
 * These are now wrappers around the deviceTypesService for backward compatibility
 */

import deviceTypesService from '../services/deviceTypesService';

// Map device_type_id back to component type for UI
export const getComponentType = (deviceTypeId) => {
  return deviceTypesService.getComponentType(deviceTypeId);
};

// Map device_type_id to appliance_type for appliances
export const getApplianceType = (deviceTypeId) => {
  return deviceTypesService.getApplianceType(deviceTypeId);
};

// Map component type to device_type_id
export const getDeviceTypeId = (componentType, applianceType) => {
  return deviceTypesService.getDeviceTypeId(componentType, applianceType);
};
