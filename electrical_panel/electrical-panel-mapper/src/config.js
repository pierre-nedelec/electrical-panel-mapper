// src/config.js

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isStandalone = process.env.REACT_APP_STANDALONE === 'true';

// Dynamic backend URL configuration
const getBackendUrl = () => {
  // For standalone development mode (frontend and backend run separately)
  if (isDevelopment && isStandalone) {
    return 'http://localhost:3001';
  }
  
  // For development mode when backend serves frontend
  if (isDevelopment && !isStandalone) {
    return 'http://localhost:8080';
  }
  
  // For production/Home Assistant add-on mode (ingress)
  // Use relative paths to work with HA ingress proxy
  return '.';
};

const config = {
  BACKEND_URL: getBackendUrl(),
  // Add debugging info for development
  _debug: {
    isDevelopment,
    isStandalone,
    backendUrl: getBackendUrl(),
    nodeEnv: process.env.NODE_ENV,
    reactAppStandalone: process.env.REACT_APP_STANDALONE
  }
};

// Log configuration in development
if (isDevelopment) {
  console.log('🔧 Frontend Config:', config._debug);
}

export default config;