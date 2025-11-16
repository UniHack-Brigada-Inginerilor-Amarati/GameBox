# Multi-stage build for NestJS backend
FROM node:22.12.0-alpine AS base

# Install dependencies stage
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY libs/shared/package.json ./libs/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/libs/shared/node_modules ./libs/shared/node_modules

# Copy source code
COPY . .

# Build the NestJS app
RUN pnpm nx build backend --configuration=production

# Production stage
FROM base AS runner
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application and dependencies
COPY --from=builder --chown=nestjs:nodejs /app/dist/apps/backend ./
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nestjs

# Expose port (Azure will set PORT env var)
EXPOSE 3111

# Azure App Service sets PORT automatically, but we default to 3111 if not set
# The application will use PORT or NEST_PORT environment variable
ENV PORT=3111

# Start the application
CMD node main.js

