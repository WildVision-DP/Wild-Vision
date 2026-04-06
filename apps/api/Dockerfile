FROM oven/bun:latest

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./

# Install dependencies (create lockfile if needed)
RUN bun install

# Copy source code
COPY . .

# Build if needed
RUN bun run build 2>/dev/null || true

# Expose port
EXPOSE 4000

# Run the API server
CMD ["bun", "run", "src/index.ts"]
