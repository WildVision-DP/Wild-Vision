FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_API_BASE_URL=http://localhost:4000
ARG VITE_ORG_NAME="Karnataka Forest Department"

# Set environment variables from build arguments
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ORG_NAME=${VITE_ORG_NAME}

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build React app (environment variables are available at build time)
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install serve and curl (for health checks)
RUN npm install -g serve && apk add --no-cache curl

# Copy built app from build stage
COPY --from=build /app/dist ./dist

# Expose port
EXPOSE 3000

# Run the app
CMD ["serve", "-s", "dist", "-l", "3000"]
