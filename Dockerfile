# Root Dockerfile for Render deployment
# Delegates to the actual backend Dockerfile in onex-webhook
FROM node:20-alpine

WORKDIR /app

# Copy entire project
COPY . .

# Install dependencies
WORKDIR /app/onex-webhook
RUN npm install --production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start backend
CMD ["node", "src/indexEnhanced.js"]
