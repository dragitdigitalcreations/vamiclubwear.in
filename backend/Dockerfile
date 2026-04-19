# syntax=docker/dockerfile:1.6

# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 8080
CMD ["node", "dist/index.js"]
