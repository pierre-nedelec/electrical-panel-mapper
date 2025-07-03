# Multi-stage build for Home Assistant Add-on
ARG BUILD_FROM
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files
COPY electrical-panel-mapper/package*.json ./

# Install frontend dependencies
RUN npm ci --only=production

# Copy frontend source code
COPY electrical-panel-mapper/ ./

# Build the React application
RUN npm run build

# Final stage - Runtime container  
FROM $BUILD_FROM

# Install required system dependencies
RUN apk add --no-cache \
    nodejs \
    npm \
    sqlite \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy backend package files
COPY electrical-panel-backend/package*.json ./

# Install backend dependencies
RUN npm ci --only=production

# Copy backend source code
COPY electrical-panel-backend/ ./

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build ./public

# Create data directory for SQLite database
RUN mkdir -p /data

# Set proper permissions
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app /data

# Switch to non-root user
USER appuser

# Expose port for Home Assistant
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database.db
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start command
CMD ["node", "index.js"] 