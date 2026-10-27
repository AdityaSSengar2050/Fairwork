# Multi-stage lightweight Node.js runtime for Google Cloud Run
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app files
COPY . .

# Expose port (Cloud Run defaults to 8080)
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Start server
CMD ["node", "src/server.js"]
