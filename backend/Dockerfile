# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose port (Railway will use PORT env variable)
EXPOSE 5000

# Health check (use 127.0.0.1 to avoid potential localhost lookup issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const port = process.env.PORT || 5000; const req = http.get('http://127.0.0.1:' + port + '/api/health', (r) => { if (r.statusCode !== 200) { console.error('health failed', r.statusCode); process.exit(1); } else { process.exit(0); } }); req.on('error', (e) => { console.error('health error', e && e.message); process.exit(1); }); req.setTimeout(8000, () => { console.error('health timeout'); process.exit(1); });"

# Start the server
CMD ["node", "server.js"]
