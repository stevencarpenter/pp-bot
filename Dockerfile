# Multi-stage optimized Dockerfile for pp-bot
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
# Reinstall devDependencies separately for type build
RUN npm install --no-audit --no-fund --ignore-scripts --save-dev typescript ts-node @types/node
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --project tsconfig.json

# Production stage
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY docker-compose.yml .
# Provide a non-root user
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["node", "dist/index.js"]

