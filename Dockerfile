# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S equoria -u 1001

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY packages/database/package*.json ./packages/database/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY backend/ ./
COPY packages/ ./packages/
USER equoria
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# Production build stage
FROM base AS build
COPY backend/ ./
COPY packages/ ./packages/
RUN npm ci && \
    npx prisma generate && \
    npm prune --production

# Production stage
FROM node:18-alpine AS production

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S equoria -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=equoria:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=equoria:nodejs /app/packages ./packages
COPY --from=build --chown=equoria:nodejs /app/*.js ./
COPY --from=build --chown=equoria:nodejs /app/routes ./routes
COPY --from=build --chown=equoria:nodejs /app/controllers ./controllers
COPY --from=build --chown=equoria:nodejs /app/models ./models
COPY --from=build --chown=equoria:nodejs /app/utils ./utils
COPY --from=build --chown=equoria:nodejs /app/middleware ./middleware
COPY --from=build --chown=equoria:nodejs /app/config ./config
COPY --from=build --chown=equoria:nodejs /app/db ./db
COPY --from=build --chown=equoria:nodejs /app/package*.json ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER equoria

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["dumb-init", "node", "server.js"] 