# ─────────────────────────────────────────────────────────────────────
# Dockerfile — OneX 99acres Webhook Server
# ─────────────────────────────────────────────────────────────────────
# Uses a multi-stage build to keep the final image lean (~80 MB).
# better-sqlite3 requires native compilation, so we install build
# tools in a builder stage and copy the compiled node_modules over.
# ─────────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install native-build dependencies needed by better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Runtime ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy pre-built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src ./src

# Create directories for persistent data and logs
RUN mkdir -p /app/data /app/logs

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
