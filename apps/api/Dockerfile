# Multi-stage Dockerfile for NestJS API

# Base image with Node.js
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace files
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/
COPY packages/utils/package*.json ./packages/utils/

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["turbo", "run", "start:dev", "--filter=@tasktimeflow/api"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN turbo run build --filter=@tasktimeflow/api

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package*.json ./
COPY --from=builder /app/packages ./packages

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Set permissions
USER nestjs

EXPOSE 3001
ENV PORT 3001

CMD ["node", "dist/main.js"]