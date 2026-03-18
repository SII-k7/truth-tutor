# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install SQLite
RUN apk add --no-cache sqlite

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/examples ./examples

# Create data directory
RUN mkdir -p /app/data && chmod 777 /app/data

# Expose port
EXPOSE 3474

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3474/api/info', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run as non-root user
USER node

# Start application
CMD ["node", "bin/truth-tutor.mjs", "serve", "--host", "0.0.0.0", "--port", "3474"]
