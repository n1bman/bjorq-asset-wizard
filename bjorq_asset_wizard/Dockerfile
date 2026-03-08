ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.19
FROM ${BUILD_FROM}

# Install Node.js and native build deps for sharp
RUN apk add --no-cache nodejs npm python3 make g++ vips-dev

WORKDIR /app

# Install dependencies (staged by prepare-addon.sh)
COPY server/package.json server/package-lock.json* ./
RUN npm ci --ignore-scripts && npm rebuild sharp

# Build TypeScript → dist/
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npx tsc

# Copy HA entry point
COPY run.sh /run.sh
RUN chmod +x /run.sh

# Runtime environment
ENV NODE_ENV=production \
    PORT=3500 \
    HOST=0.0.0.0

EXPOSE 3500

CMD ["/run.sh"]
