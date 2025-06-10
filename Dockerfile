# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p backend/uploads

# Expose port (Render will use PORT env var)
EXPOSE 10000

# Start the application
CMD ["npm", "start"]
