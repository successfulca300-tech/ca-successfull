# Root Dockerfile that delegates to backend
# Railway will detect this and use it for deployment

FROM node:18-alpine

WORKDIR /app

# Copy backend files only
COPY backend/package*.json ./backend/
COPY backend/ ./backend/

WORKDIR /app/backend

# Install dependencies
RUN npm ci --only=production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const port = process.env.PORT || 5000; const req = http.get('http://127.0.0.1:' + port + '/api/health', (r) => { if (r.statusCode !== 200) { console.error('health failed', r.statusCode); process.exit(1); } else { process.exit(0); } }); req.on('error', (e) => { console.error('health error', e && e.message); process.exit(1); }); req.setTimeout(8000, () => { console.error('health timeout'); process.exit(1); });"

# Start the backend server
CMD ["node", "server.js"]
