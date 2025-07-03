ARG BUILD_FROM
FROM $BUILD_FROM

# Install required dependencies including build tools for native modules
RUN apk add --no-cache \
    nodejs \
    npm \
    sqlite \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY electrical-panel-backend/package*.json ./backend/
COPY electrical-panel-mapper/package*.json ./frontend/

# Install backend dependencies (smaller, faster)
WORKDIR /app/backend
RUN npm ci --only=production

# Install frontend dependencies and build
WORKDIR /app/frontend  
RUN npm ci \
    && NODE_OPTIONS="--max-old-space-size=1024" npm run build \
    && npm prune --production

# Copy application code
WORKDIR /app
COPY electrical-panel-backend/ ./backend/
COPY electrical-panel-mapper/ ./frontend/

# Copy built frontend to backend public directory
RUN cp -r frontend/build backend/public

# Create data directory
RUN mkdir -p /data

# Set proper permissions
RUN addgroup -g 1000 appuser && \
    adduser -D -s /bin/sh -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app /data

USER appuser

# Expose port
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database.db
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start command
WORKDIR /app/backend
CMD ["node", "index.js"] 