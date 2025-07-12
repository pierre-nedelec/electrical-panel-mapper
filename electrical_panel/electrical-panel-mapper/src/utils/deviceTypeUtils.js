// src/utils/deviceTypeUtils.js
import config from '../config';

export const fetchDeviceTypes = async () => {
  try {
    const response = await fetch(`${config.BACKEND_URL}/api/electrical/symbols`);
    if (!response.ok) throw new Error('Error fetching device types');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};
