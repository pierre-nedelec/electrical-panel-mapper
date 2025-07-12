// src/hooks/useDeviceTypes.js
import { useState, useEffect } from 'react';
import config from '../config';

const useDeviceTypes = () => {
  const [deviceTypes, setDeviceTypes] = useState([]);

  useEffect(() => {
    fetch(`${config.BACKEND_URL}/api/electrical/symbols`)
      .then((response) => response.json())
      .then((data) => setDeviceTypes(data))
      .catch((err) => console.error('Error fetching device types:', err));
  }, []);

  return deviceTypes;
};

export default useDeviceTypes;
