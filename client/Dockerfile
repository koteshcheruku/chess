FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source (volume mount overrides in dev)
COPY . .

EXPOSE 5173

# Vite must bind to 0.0.0.0 to be reachable from host
CMD ["npx", "vite", "--host", "0.0.0.0"]
