# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx drizzle-kit generate || true
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
# jpeg-js (zero-dependency, pure JS) is externalized from the bundle for image downsampling.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/jpeg-js ./node_modules/jpeg-js
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
