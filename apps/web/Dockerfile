# Multi-stage Dockerfile for Next.js application

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
COPY apps/web/package*.json ./apps/web/
COPY packages/types/package*.json ./packages/types/
COPY packages/ui/package*.json ./packages/ui/
COPY packages/utils/package*.json ./packages/utils/

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["turbo", "run", "dev", "--filter=@tasktimeflow/web"]

# Build stage
FROM base AS builder
RUN npm ci
COPY . .
RUN turbo run build --filter=@tasktimeflow/web

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set permissions
USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]