# ─────────────────────────────────────────────────────────────────────
# Root Dockerfile — OneX CRM Webhook Server
# ─────────────────────────────────────────────────────────────────────
# Multi-stage build for lean production image (~80 MB)
# ─────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install native-build dependencies needed by better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy webhook package files
COPY onex-webhook/package.json onex-webhook/package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Runtime ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy pre-built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source from onex-webhook
COPY onex-webhook/package.json ./
COPY onex-webhook/src ./src

# Create data directory for SQLite and set permissions
RUN mkdir -p data && chown -R node:node /app

# Switch to non-root user (node user already exists in node:20-alpine)
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/admin/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "src/index.js"]
