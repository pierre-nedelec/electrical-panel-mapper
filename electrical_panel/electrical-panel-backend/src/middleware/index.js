const cors = require('cors');
const express = require('express');
const { isIPAllowed } = require('../config');

/**
 * Middleware module for the Electrical Panel Mapper backend
 * Handles CORS, IP filtering, and other middleware functions
 */

/**
 * Configure CORS middleware
 * @returns {Function} CORS middleware
 */
const configureCORS = () => {
  return cors();
};

/**
 * Configure JSON parsing middleware
 * @returns {Function} JSON parsing middleware
 */
const configureJSON = () => {
  return express.json();
};

/**
 * Configure trust proxy setting
 * @param {Express} app - Express application instance
 */
const configureTrustProxy = (app) => {
  // Trust proxy for accurate IP detection (required for ingress)
  app.set('trust proxy', true);
};

/**
 * IP filtering middleware for Home Assistant ingress security
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
const ipFilterMiddleware = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

  console.log(`📝 ${req.method} ${req.url} from ${clientIP}`);

  if (isIPAllowed(clientIP)) {
    next();
  } else {
    console.log(`❌ Rejected request from unauthorized IP: ${clientIP}`);
    res.status(403).send('Access denied');
  }
};

/**
 * Apply all middleware to the Express app
 * @param {Express} app - Express application instance
 */
const applyMiddleware = (app) => {
  configureTrustProxy(app);
  app.use(configureCORS());
  app.use(configureJSON());
  app.use(ipFilterMiddleware);
};

module.exports = {
  configureCORS,
  configureJSON,
  configureTrustProxy,
  ipFilterMiddleware,
  applyMiddleware
}; 