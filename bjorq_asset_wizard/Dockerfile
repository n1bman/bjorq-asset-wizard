ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19
FROM ${BUILD_FROM}

WORKDIR /app

# Copy full repository
COPY . /app

# Install Node
RUN apk add --no-cache nodejs npm python3 make g++

# Install dependencies
RUN npm install

# Build backend
RUN npm run build || true

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
